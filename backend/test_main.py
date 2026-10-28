from fastapi.testclient import TestClient

from main import app, analyze_witness_description

client = TestClient(app)


def test_health_reports_demo_mode():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "analysis_mode": "demo",
        "analyzer": "rule_based_demo",
    }


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
