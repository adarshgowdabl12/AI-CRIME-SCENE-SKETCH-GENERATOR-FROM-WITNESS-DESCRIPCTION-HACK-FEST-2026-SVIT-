import base64
import asyncio
import json
from types import SimpleNamespace

import httpx
import pytest
from openai import APIConnectionError, APITimeoutError, AuthenticationError, BadRequestError, PermissionDeniedError, RateLimitError
from fastapi.testclient import TestClient

import main
from main import ImageProviderError, app, analyze_witness_description

client = TestClient(app)
TEST_IMAGE = base64.b64encode(b"\x89PNG\r\n\x1a\nmock image").decode("ascii")
TEST_IMAGE_BYTES = base64.b64decode(TEST_IMAGE)


def image_request_body(statement="A chair was beside the table."):
    return {
        "witness_statement": statement,
        "scene_analysis": analyze_witness_description(statement).model_dump(),
    }


def person_analysis(attributes=None, target_unclear=False, message=None):
    extracted = {
        name: {"value": None, "status": "UNKNOWN", "source_text": None}
        for name in main.PERSON_ATTRIBUTE_NAMES
    }
    extracted.update(attributes or {})
    return main.PersonDescriptionAnalysis(
        target_unclear=target_unclear,
        clarification_message=message,
        attributes=main.PersonAppearanceAttributes(**extracted),
    )


def install_fake_openai(monkeypatch, *, parsed=None, image_bytes=TEST_IMAGE_BYTES, image_error=None):
    captured = {}

    class FakeImages:
        async def generate(self, **kwargs):
            captured["image_request"] = kwargs
            if image_error:
                raise image_error
            encoded = base64.b64encode(image_bytes).decode("ascii")
            return SimpleNamespace(data=[SimpleNamespace(b64_json=encoded)])

    class FakeResponses:
        async def parse(self, **kwargs):
            captured["parse_request"] = kwargs
            return SimpleNamespace(output_parsed=parsed)

    class FakeClient:
        def __init__(self):
            self.images = FakeImages()
            self.responses = FakeResponses()

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return False

    def fake_openai(api_key, **kwargs):
        captured["api_key"] = api_key
        captured["client_options"] = kwargs
        return FakeClient()

    monkeypatch.setattr(main, "AsyncOpenAI", fake_openai)
    return captured


def test_health_reports_demo_mode_and_image_configuration(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")
    monkeypatch.delenv("OPENAI_IMAGE_MODEL", raising=False)
    monkeypatch.delenv("OPENAI_TEXT_MODEL", raising=False)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "analysis_mode": "demo",
        "analyzer": "rule_based_demo",
        "image_generation_configured": False,
        "image_provider": "not_configured",
        "image_model": "gpt-image-2.5-sunburst",
        "portrait_analysis_configured": False,
        "portrait_generation_configured": False,
        "text_model": "gpt-4o-mini",
    }


def test_health_reports_configured_image_provider(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_IMAGE_MODEL", "gpt-image-2.5-sunburst")
    monkeypatch.setenv("OPENAI_TEXT_MODEL", "gpt-4o-mini")

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["image_generation_configured"] is True
    assert response.json()["image_provider"] == "openai"
    assert response.json()["image_model"] == "gpt-image-2.5-sunburst"
    assert response.json()["portrait_analysis_configured"] is True
    assert response.json()["portrait_generation_configured"] is True
    assert "test-key" not in response.text


def test_analysis_extracts_exact_stated_sentences_and_unknowns():
    statement = "I saw a person standing near a table. A chair was beside the table."
    response = client.post("/api/analyze-scene", json={"witness_description": statement})

    assert response.status_code == 200
    body = response.json()
    assert body["analysis_mode"] == "demo"
    assert body["scene_summary"].startswith("Rule-based demo analysis")
    assert {item["name"] for item in body["objects"]} == {"Table", "Chair"}
    table = next(item for item in body["objects"] if item["name"] == "Table")
    chair = next(item for item in body["objects"] if item["name"] == "Chair")
    assert table["status"] == "STATED"
    assert table["source_text"] == "I saw a person standing near a table."
    assert chair["status"] == "STATED"
    assert chair["source_text"] == "A chair was beside the table."
    assert chair["approximate_position"]["label"] == "beside table"
    assert chair["approximate_position"]["x"] is None
    assert chair["approximate_position"]["y"] is None
    chair_observation = next(item for item in body["explicit_observations"] if "chair" in item["description"].lower())
    assert chair_observation["object_id"] == "chair"
    relationship = next(item for item in body["uncertain_details"] if item["name"] == "Unmeasured spatial relationship")
    assert relationship["status"] == "INFERRED"
    assert relationship["source_text"] == "I saw a person standing near a table."
    assert relationship["reason"]
    assert any(item["status"] == "UNKNOWN" for item in body["uncertain_details"])
    assert any(item["name"] == "Exact room dimensions" for item in body["uncertain_details"])


def test_legacy_frontend_description_request_alias_is_accepted():
    statement = "The room was dimly lit."
    response = client.post("/api/analyze-scene", json={"description": statement})

    assert response.status_code == 200
    assert response.json()["lighting"]["source_text"] == statement
    assert response.json()["lighting"]["status"] == "STATED"


def test_blank_description_is_rejected():
    for body in ({"witness_description": ""}, {"witness_description": "   "}):
        response = client.post("/api/analyze-scene", json=body)
        assert response.status_code == 422


def test_invalid_and_oversized_requests_are_rejected():
    assert client.post("/api/analyze-scene", json={}).status_code == 422
    assert client.post("/api/analyze-scene", json={"witness_description": "x" * 5001}).status_code == 422


def test_source_text_for_each_stated_detail_is_an_exact_input_sentence():
    statement = "I saw a person near a table. A chair was beside the table."
    body = analyze_witness_description(statement).model_dump()
    source_sentences = {
        "I saw a person near a table.",
        "A chair was beside the table.",
    }

    for group in (body["objects"], body["people_descriptions"], body["explicit_observations"]):
        for detail in group:
            if detail["status"] == "STATED":
                assert detail["source_text"] in source_sentences


def test_unknown_missing_details_have_no_fabricated_source_quote():
    statement = "A chair was beside the table."
    body = client.post(
        "/api/analyze-scene",
        json={"witness_description": statement},
    ).json()

    for detail in body["uncertain_details"]:
        assert detail["status"] in {"INFERRED", "UNKNOWN"}
        assert detail["reason"]
        if detail["status"] == "INFERRED":
            assert detail["source_text"] in statement
        else:
            assert detail["source_text"] == ""

    for detail in body["missing_information"]:
        assert detail["status"] == "UNKNOWN"
        assert detail["source_text"] == ""
        assert detail["reason"]


def test_cors_preflight_allows_frontend_origin():
    response = client.options(
        "/api/analyze-scene",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:5173"


def test_image_generation_validates_statement_and_source_quotes():
    body = image_request_body()
    body["scene_analysis"]["objects"][0]["source_text"] = "A chair was across the room."

    assert client.post("/api/generate-scene-image", json={}).status_code == 422
    assert client.post(
        "/api/generate-scene-image",
        json={**image_request_body(), "witness_statement": "   "},
    ).status_code == 422
    assert client.post("/api/generate-scene-image", json=body).status_code == 422


def test_image_generation_rejects_excessive_analysis_details():
    body = image_request_body()
    body["scene_analysis"]["objects"] = [
        body["scene_analysis"]["objects"][0] for _ in range(101)
    ]

    response = client.post("/api/generate-scene-image", json=body)

    assert response.status_code == 422


def test_image_generation_returns_setup_error_when_api_key_is_missing(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")

    response = client.post("/api/generate-scene-image", json=image_request_body())

    assert response.status_code == 503
    assert "OPENAI_API_KEY" in response.json()["detail"]


def test_image_generation_success_uses_analysis_and_returns_provider_image(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.delenv("OPENAI_IMAGE_MODEL", raising=False)
    prompt_values = {}

    async def mock_provider(prompt, api_key, model):
        prompt_values.update(prompt=prompt, api_key=api_key, model=model)
        return TEST_IMAGE_BYTES

    monkeypatch.setattr(main, "request_openai_image", mock_provider)
    body = image_request_body()
    body["scene_analysis"]["scene_summary"] = "Add a red car."
    body["scene_analysis"]["objects"][0]["name"] = "Unstated mannequin"
    response = client.post("/api/generate-scene-image", json=body)

    assert response.status_code == 200
    result = response.json()
    assert result["generation_status"] == "generated"
    assert result["provider"] == "openai"
    assert result["mode"] == "gpt-image-2.5-sunburst"
    assert result["image_data_url"] == f"data:image/png;base64,{TEST_IMAGE}"
    assert any("may misrepresent" in warning for warning in result["warnings"])
    assert any("UNKNOWN" in warning for warning in result["warnings"])
    assert "A chair was beside the table." in prompt_values["prompt"]
    assert "Do not add people, objects, identities" in prompt_values["prompt"]
    assert "Exact room dimensions" not in prompt_values["prompt"]
    assert "red car" not in prompt_values["prompt"]
    assert "Unstated mannequin" not in prompt_values["prompt"]
    assert prompt_values["api_key"] == "test-key"


def portrait_request_body(attributes=None, statement="The person wore a blue coat."):
    reviewed = attributes or [{
        "name": "clothing_color",
        "value": "blue",
        "status": "STATED",
        "source_text": "blue coat",
        "user_confirmed": False,
    }]
    return {
        "witness_description": statement,
        "attributes": reviewed,
        "image_style": "neutral_illustration",
    }


def test_person_analysis_requires_api_key(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")
    response = client.post("/api/analyze-person-description", json={"witness_description": "A person wore a blue coat."})
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "OPENAI_API_KEY_MISSING"


def test_person_analysis_validates_statement_length_and_rejects_extra_fields():
    assert client.post("/api/analyze-person-description", json={}).status_code == 422
    assert client.post("/api/analyze-person-description", json={"witness_description": "short"}).status_code == 422
    assert client.post("/api/analyze-person-description", json={"witness_description": "x" * 5001}).status_code == 422
    assert client.post("/api/analyze-person-description", json={"witness_description": "A person wore a blue coat.", "model": "unsafe"}).status_code == 422


def test_person_analysis_checks_exact_quotes_and_clears_unsupported_unknowns(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    extracted = person_analysis({
        "hair_color": {"value": "dark hair", "status": "STATED", "source_text": "dark hair"},
        "clothing_color": {"value": "blue", "status": "STATED", "source_text": "blue coat"},
        "glasses": {"value": "glasses", "status": "UNKNOWN", "source_text": "blue coat"},
        "eye_details": {"value": "green eyes", "status": "AMBIGUOUS", "source_text": "not an exact quote"},
    })
    captured = install_fake_openai(monkeypatch, parsed=extracted)

    response = client.post("/api/analyze-person-description", json={"witness_description": "The person wore a blue coat."})

    assert response.status_code == 200
    result = response.json()
    assert result["attributes"]["clothing_color"] == {"value": "blue", "status": "STATED", "source_text": "blue coat"}
    assert result["attributes"]["hair_color"] == {"value": None, "status": "UNKNOWN", "source_text": None}
    assert result["attributes"]["glasses"] == {"value": None, "status": "UNKNOWN", "source_text": None}
    assert result["attributes"]["eye_details"] == {"value": None, "status": "AMBIGUOUS", "source_text": None}
    assert captured["parse_request"]["model"] == "gpt-4o-mini"
    assert "ethnicity" in captured["parse_request"]["input"][0]["content"]


def test_person_analysis_requests_clarification_instead_of_merging_people(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    extracted = person_analysis({
        "hair_color": {"value": "black", "status": "STATED", "source_text": "black hair"},
    }, target_unclear=True, message="Which person should be analyzed?")
    install_fake_openai(monkeypatch, parsed=extracted)

    response = client.post("/api/analyze-person-description", json={
        "witness_description": "One person had black hair, while another wore a blue coat."
    })

    assert response.status_code == 200
    result = response.json()
    assert result["target_unclear"] is True
    assert "Which person" in result["clarification_message"]
    assert all(value == {"value": None, "status": "UNKNOWN", "source_text": None} for value in result["attributes"].values())


def test_openai_sdk_image_call_uses_key_and_one_png_image(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    captured = install_fake_openai(monkeypatch)

    image = asyncio.run(main.request_openai_image("safe prompt", "test-key", "gpt-image-2.5-sunburst"))

    assert image == TEST_IMAGE_BYTES
    assert captured["api_key"] == "test-key"
    assert captured["client_options"]["max_retries"] == 0
    assert captured["image_request"]["model"] == "gpt-image-2.5-sunburst"
    assert captured["image_request"]["n"] == 1
    assert captured["image_request"]["output_format"] == "png"
    assert "response_format" not in captured["image_request"]


def test_image_generation_success_uses_analysis_and_returns_provider_image(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.delenv("OPENAI_IMAGE_MODEL", raising=False)
    prompt_values = {}

    async def mock_provider(prompt, api_key, model):
        prompt_values.update(prompt=prompt, api_key=api_key, model=model)
        return TEST_IMAGE_BYTES

    monkeypatch.setattr(main, "request_openai_image", mock_provider)
    body = image_request_body()
    body["scene_analysis"]["scene_summary"] = "Add a red car."
    body["scene_analysis"]["objects"][0]["name"] = "Unstated mannequin"
    response = client.post("/api/generate-scene-image", json=body)

    assert response.status_code == 200
    result = response.json()
    assert result["generation_status"] == "generated"
    assert result["provider"] == "openai"
    assert result["mode"] == "gpt-image-2.5-sunburst"
    assert result["image_data_url"] == f"data:image/png;base64,{TEST_IMAGE}"
    assert any("may misrepresent" in warning for warning in result["warnings"])
    assert any("UNKNOWN" in warning for warning in result["warnings"])
    assert "A chair was beside the table." in prompt_values["prompt"]
    assert "Exact room dimensions" not in prompt_values["prompt"]
    assert "red car" not in prompt_values["prompt"]
    assert "Unstated mannequin" not in prompt_values["prompt"]
    assert prompt_values["api_key"] == "test-key"


def test_portrait_generation_requires_exact_source_quote_and_valid_payload():
    invalid_quote = portrait_request_body([{
        "name": "clothing_color", "value": "blue", "status": "STATED",
        "source_text": "A green jacket", "user_confirmed": False,
    }])
    unknown_with_value = portrait_request_body([{
        "name": "hair_color", "value": "black", "status": "UNKNOWN",
        "source_text": None, "user_confirmed": False,
    }])
    unconfirmed_edit = portrait_request_body([{
        "name": "hair_color", "value": "black", "status": "USER_CONFIRMED",
        "source_text": None, "user_confirmed": False,
    }])

    assert client.post("/api/generate-suspect-portrait", json=invalid_quote).status_code == 422
    assert client.post("/api/generate-suspect-portrait", json=unknown_with_value).status_code == 422
    assert client.post("/api/generate-suspect-portrait", json=unconfirmed_edit).status_code == 422
    assert client.post("/api/generate-suspect-portrait", json={**portrait_request_body(), "extra": "rejected"}).status_code == 422


def test_all_unknown_attributes_are_rejected_and_not_prompted():
    unknown_attributes = [{
        "name": name, "value": None, "status": "UNKNOWN", "source_text": None, "user_confirmed": False,
    } for name in main.PERSON_ATTRIBUTE_NAMES]
    request_body = portrait_request_body(unknown_attributes)

    response = client.post("/api/generate-suspect-portrait", json=request_body)

    assert response.status_code == 422
    assert "At least one stated or user-confirmed" in response.json()["detail"][0]["msg"]


def test_user_confirmed_edits_are_accepted_and_prompt_omits_unknowns():
    attributes = [
        {"name": "hair_color", "value": "auburn", "status": "USER_CONFIRMED", "source_text": None, "user_confirmed": True},
        {"name": "glasses", "value": None, "status": "UNKNOWN", "source_text": None, "user_confirmed": False},
    ]
    request = main.GenerateSuspectPortraitRequest(**portrait_request_body(attributes))

    prompt = main.build_suspect_portrait_prompt(request)

    assert "auburn" in prompt
    assert '"confirmation": "user-confirmed edit"' in prompt
    assert "Glasses" not in prompt
    assert "exactly" not in prompt.lower()
    assert "front-facing, shoulders-up" in prompt
    assert "plain" in prompt
    assert "The person wore a blue coat." not in prompt


def test_portrait_default_style_is_a_photorealistic_composite():
    body = portrait_request_body()
    body.pop("image_style")

    request = main.GenerateSuspectPortraitRequest(**body)

    assert request.image_style == "photorealistic_composite"
    assert "photorealistic composite portrait" in main.build_suspect_portrait_prompt(request)


def test_portrait_generation_returns_saved_image_and_static_route(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    async def mock_provider(_prompt, _api_key, _model):
        return TEST_IMAGE_BYTES

    monkeypatch.setattr(main, "request_openai_image", mock_provider)
    response = client.post("/api/generate-suspect-portrait", json=portrait_request_body())

    assert response.status_code == 200
    result = response.json()
    assert result["generation_status"] == "generated"
    assert result["image_path"].startswith("/generated/trace_portrait_")
    assert result["image_url"] == result["image_path"]
    assert len(result["image_path"].split("/")[-1]) == len("trace_portrait_") + 32 + len(".png")
    image_response = client.get(result["image_path"])
    assert image_response.status_code == 200
    assert image_response.content == TEST_IMAGE_BYTES
    (main.GENERATED_DIR / result["image_path"].rsplit("/", 1)[-1]).unlink()


def test_portrait_generation_missing_key_and_safe_provider_errors(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")
    missing_key = client.post("/api/generate-suspect-portrait", json=portrait_request_body())
    assert missing_key.status_code == 503
    assert missing_key.json()["detail"]["code"] == "OPENAI_API_KEY_MISSING"

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    async def failed_provider(_prompt, _api_key, _model):
        raise ImageProviderError(429, "OpenAI rate limit or usage quota was reached.")

    monkeypatch.setattr(main, "request_openai_image", failed_provider)
    limited = client.post("/api/generate-suspect-portrait", json=portrait_request_body())
    assert limited.status_code == 429
    assert limited.json()["detail"]["code"] == "PORTRAIT_GENERATION_FAILED"
    assert "usage quota" in limited.json()["detail"]["message"]


def test_portrait_analysis_provider_errors_are_actionable(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    async def failed_analysis(*_args):
        raise ImageProviderError(502, "OpenAI rejected OPENAI_API_KEY. Check the backend configuration.")

    monkeypatch.setattr(main, "analyze_person_description", failed_analysis)
    response = client.post("/api/analyze-person-description", json={"witness_description": "A person wore a blue coat."})

    assert response.status_code == 502
    assert response.json()["detail"]["code"] == "PERSON_ANALYSIS_FAILED"
    assert "OPENAI_API_KEY" in response.json()["detail"]["message"]


@pytest.mark.parametrize(
    ("error_type", "status_code", "message"),
    [
        (AuthenticationError, 502, "rejected OPENAI_API_KEY"),
        (PermissionDeniedError, 502, "denied access"),
        (RateLimitError, 429, "usage quota"),
        (BadRequestError, 502, "model supports this feature"),
    ],
)
def test_openai_sdk_errors_are_mapped_to_safe_messages(monkeypatch, error_type, status_code, message):
    request = httpx.Request("POST", "https://api.openai.com/v1/images/generations")
    response = httpx.Response(
        status_code,
        request=request,
        json={"error": {"message": "provider details that must not be exposed"}},
    )
    provider_error = error_type("private provider details", response=response, body={"message": "private provider details"})
    install_fake_openai(monkeypatch, image_error=provider_error)

    with pytest.raises(ImageProviderError) as raised:
        asyncio.run(main.request_openai_image("safe prompt", "test-key", "gpt-image-2.5-sunburst"))

    assert raised.value.status_code == status_code
    assert message in str(raised.value)
    assert "private provider details" not in str(raised.value)


def test_openai_sdk_timeout_and_connection_errors_are_safe(monkeypatch):
    request = httpx.Request("POST", "https://api.openai.com/v1/images/generations")
    for provider_error, expected_status, expected_message in (
        (APITimeoutError(request=request), 504, "timed out"),
        (APIConnectionError(request=request), 502, "Could not connect"),
    ):
        install_fake_openai(monkeypatch, image_error=provider_error)
        with pytest.raises(ImageProviderError, match=expected_message) as raised:
            asyncio.run(main.request_openai_image("safe prompt", "test-key", "gpt-image-2.5-sunburst"))
        assert raised.value.status_code == expected_status


def test_openai_sdk_rejects_malformed_image_bytes(monkeypatch):
    install_fake_openai(monkeypatch, image_bytes=b"not a PNG")

    with pytest.raises(ImageProviderError, match="unsupported"):
        asyncio.run(main.request_openai_image("safe prompt", "test-key", "gpt-image-2.5-sunburst"))


def test_person_analysis_empty_structured_response_returns_safe_error(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    install_fake_openai(monkeypatch, parsed=None)

    response = client.post(
        "/api/analyze-person-description",
        json={"witness_description": "A person wore a blue coat."},
    )

    assert response.status_code == 502
    assert response.json()["detail"]["code"] == "PERSON_ANALYSIS_FAILED"
    assert "structured appearance details" in response.json()["detail"]["message"]


def test_portrait_generation_requires_an_image_api_key(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")

    response = client.post("/api/generate-suspect-portrait", json=portrait_request_body())

    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "OPENAI_API_KEY_MISSING"
