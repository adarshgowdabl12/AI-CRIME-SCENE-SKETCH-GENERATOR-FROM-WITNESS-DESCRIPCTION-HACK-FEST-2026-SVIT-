from __future__ import annotations

import os
import re
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator

TrustStatus = Literal["STATED", "INFERRED", "UNKNOWN"]


class AnalysisRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    witness_description: str = Field(
        min_length=1,
        max_length=5000,
        validation_alias=AliasChoices("witness_description", "description"),
    )

    @field_validator("witness_description")
    @classmethod
    def description_must_not_be_blank(cls, value: str) -> str:
        if not value:
            raise ValueError("witness_description must not be blank")
        return value


class ApproximatePosition(BaseModel):
    label: str
    status: TrustStatus = "STATED"
    x: float | None = None
    y: float | None = None


class SceneDetail(BaseModel):
    name: str
    description: str
    source_text: str
    status: TrustStatus
    approximate_position: ApproximatePosition | None = None
    reason: str = ""
    object_id: str | None = None


class SceneAnalysisResponse(BaseModel):
    scene_summary: str
    location: SceneDetail
    lighting: SceneDetail
    objects: list[SceneDetail]
    people_descriptions: list[SceneDetail]
    explicit_observations: list[SceneDetail]
    uncertain_details: list[SceneDetail]
    missing_information: list[SceneDetail]
    analysis_mode: Literal["demo", "live"]


class HealthResponse(BaseModel):
    status: Literal["ok"]
    analysis_mode: Literal["demo", "live"]
    analyzer: str


OBJECT_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("table", re.compile(r"\btables?\b", re.IGNORECASE)),
    ("chair", re.compile(r"\bchairs?\b", re.IGNORECASE)),
    ("bag", re.compile(r"\bbags?\b", re.IGNORECASE)),
    ("window", re.compile(r"\bwindows?\b", re.IGNORECASE)),
    ("door", re.compile(r"\bdoors?\b", re.IGNORECASE)),
    ("bicycle", re.compile(r"\b(?:bicycles?|bikes?)\b", re.IGNORECASE)),
    ("vehicle", re.compile(r"\b(?:vehicles?|cars?|trucks?)\b", re.IGNORECASE)),
    ("phone", re.compile(r"\bphones?\b", re.IGNORECASE)),
    ("lamp", re.compile(r"\blamps?\b", re.IGNORECASE)),
    ("desk", re.compile(r"\bdesks?\b", re.IGNORECASE)),
    ("bottle", re.compile(r"\bbottles?\b", re.IGNORECASE)),
    ("box", re.compile(r"\bbox(?:es)?\b", re.IGNORECASE)),
    ("knife", re.compile(r"\bknives\b|\bknife\b", re.IGNORECASE)),
    ("glass", re.compile(r"\bglass(?: panel| piece|es)?\b", re.IGNORECASE)),
)
PERSON_PATTERN = re.compile(r"\b(?:person|people|man|woman|individual|someone)\b", re.IGNORECASE)
ROOM_PATTERN = re.compile(r"\b(?:room|kitchen|bedroom|hallway|office|store|building|street|alley)\b", re.IGNORECASE)
LIGHTING_PATTERN = re.compile(r"\b(?:dim(?:ly)? lit|dark|bright(?:ly)? lit|well lit|poorly lit|lights? (?:was|were) on|unlit)\b", re.IGNORECASE)
RELATION_PATTERN = re.compile(
    r"\b(?:near|beside|next to|by|under|above|behind|in front of|inside|outside)\s+(?:the|a|an)\s+([a-z][a-z-]*)",
    re.IGNORECASE,
)
HOLDING_PATTERN = re.compile(
    r"\b(?:holding|carrying)\s+(?:a|an|the)\s+(?:[a-z-]+\s+){0,2}(?P<object>bag|phone|bottle|box)\b",
    re.IGNORECASE,
)
EXPLICIT_UNKNOWN_PATTERN = re.compile(
    r"\b(?:unknown|not known|cannot tell|could not tell|unsure|unclear|not specified)\b",
    re.IGNORECASE,
)


def split_sentences(description: str) -> list[str]:
    return [part.strip() for part in re.findall(r"[^.!?]+[.!?]+|[^.!?]+$", description) if part.strip()]


def _detail(
    name: str,
    description: str,
    source_text: str,
    status: TrustStatus,
    *,
    approximate_position: ApproximatePosition | None = None,
    reason: str = "",
    object_id: str | None = None,
) -> SceneDetail:
    return SceneDetail(
        name=name,
        description=description,
        source_text=source_text,
        status=status,
        approximate_position=approximate_position,
        reason=reason,
        object_id=object_id,
    )


def _relation_for_object(sentence: str, canonical_name: str) -> ApproximatePosition | None:
    escaped_name = re.escape(canonical_name)
    relation = re.search(
        rf"\b(?:a|an|the)?\s*{escaped_name}s?\s+(?:is|was|were|lies?|sat|stood|rested)?\s*"
        r"(?P<relation>near|beside|next to|by|under|above|behind|in front of|inside|outside)\s+"
        r"(?:the|a|an)\s+(?P<target>[a-z][a-z-]*)",
        sentence,
        re.IGNORECASE,
    )
    if relation:
        return ApproximatePosition(
            label=f"{relation.group('relation').lower()} {relation.group('target').lower()}",
            status="STATED",
        )

    held = HOLDING_PATTERN.search(sentence)
    if held and held.group("object").lower() == canonical_name:
        return ApproximatePosition(label="held by a person", status="STATED")
    return None


def _sentence_subject_object_id(sentence: str, detected_object_ids: list[str]) -> str | None:
    subject = re.match(r"^\s*(?:a|an|the)\s+([a-z]+)", sentence, re.IGNORECASE)
    if subject:
        candidate = subject.group(1).lower()
        aliases = {"bikes": "bicycle", "bike": "bicycle", "windows": "window", "chairs": "chair", "tables": "table"}
        candidate = aliases.get(candidate, candidate)
        if candidate in detected_object_ids:
            return candidate
    return detected_object_ids[0] if detected_object_ids else None


def analyze_witness_description(description: str) -> SceneAnalysisResponse:
    sentences = split_sentences(description)
    objects_by_name: dict[str, SceneDetail] = {}
    people_by_name: dict[str, SceneDetail] = {}
    observations: list[SceneDetail] = []
    location: SceneDetail | None = None
    lighting: SceneDetail | None = None

    for sentence_index, sentence in enumerate(sentences, start=1):
        sentence_object_ids: list[str] = []

        for object_name, pattern in OBJECT_PATTERNS:
            if not pattern.search(sentence):
                continue
            object_id = object_name
            sentence_object_ids.append(object_id)
            if object_name not in objects_by_name:
                objects_by_name[object_name] = _detail(
                    name=object_name.title(),
                    description=sentence,
                    source_text=sentence,
                    status="STATED",
                    approximate_position=_relation_for_object(sentence, object_name),
                    reason=(
                        "The witness states the object but gives no relative location."
                        if not _relation_for_object(sentence, object_name)
                        else ""
                    ),
                    object_id=object_id,
                )

        if PERSON_PATTERN.search(sentence) and "person" not in people_by_name:
            position_match = RELATION_PATTERN.search(sentence)
            approximate_position = (
                ApproximatePosition(
                    label=f"{position_match.group(0).strip().lower()}",
                    status="STATED",
                )
                if position_match
                else None
            )
            people_by_name["person"] = _detail(
                name="Person",
                description=sentence,
                source_text=sentence,
                status="STATED",
                approximate_position=approximate_position,
                reason="" if approximate_position else "The account does not describe the person's position.",
            )

        if ROOM_PATTERN.search(sentence) and location is None:
            location = _detail("Location", sentence, sentence, "STATED")
        if LIGHTING_PATTERN.search(sentence) and lighting is None:
            lighting = _detail("Lighting", sentence, sentence, "STATED")

        observations.append(
            _detail(
                name=f"Observation {sentence_index}",
                description=sentence,
                source_text=sentence,
                status="STATED",
                reason="",
                object_id=_sentence_subject_object_id(sentence, sentence_object_ids),
            )
        )

    unknown_location = _detail(
        name="Location",
        description="A specific location was not identified in the witness account.",
        source_text="",
        status="UNKNOWN",
        reason="No room, building, or outdoor location is specified.",
    )
    unknown_lighting = _detail(
        name="Lighting",
        description="Lighting conditions were not specified.",
        source_text="",
        status="UNKNOWN",
        reason="The witness account contains no lighting description.",
    )

    uncertain_details = [
        _detail(
            name="Exact distances between objects",
            description="Exact object-to-object distances cannot be determined from the account.",
            source_text="",
            status="UNKNOWN",
            reason="No measurements are provided; relational words such as 'near' are not exact distances.",
        ),
        _detail(
            name="Exact room dimensions",
            description="Room dimensions are not available.",
            source_text="",
            status="UNKNOWN",
            reason="The witness account provides no measurements or scale.",
        ),
    ]
    relational_sentence = next((sentence for sentence in sentences if RELATION_PATTERN.search(sentence)), "")
    if relational_sentence:
        uncertain_details.append(
            _detail(
                name="Unmeasured spatial relationship",
                description="A relative term is used, but no exact distance or map coordinate is provided.",
                source_text=relational_sentence,
                status="INFERRED",
                reason="This is a rule-based interpretation of relational wording; it is not a measured position.",
            )
        )
    if EXPLICIT_UNKNOWN_PATTERN.search(description):
        uncertain_details.append(
            _detail(
                name="Unspecified or uncertain statement detail",
                description="The witness explicitly describes a detail as unknown or unclear.",
                source_text=next((sentence for sentence in sentences if EXPLICIT_UNKNOWN_PATTERN.search(sentence)), ""),
                status="UNKNOWN",
                reason="The witness statement itself marks this information as uncertain.",
            )
        )

    missing_information = [
        _detail(
            name="Time of observation",
            description="The time of the observation was not provided.",
            source_text="",
            status="UNKNOWN",
            reason="No time or date was found in the witness account.",
        ),
        _detail(
            name="Identity of the person",
            description="No identity is established by this analysis.",
            source_text="",
            status="UNKNOWN",
            reason="The witness description is not sufficient to identify anyone.",
        ),
    ]

    object_count = len(objects_by_name)
    people_count = len(people_by_name)
    summary = (
        f"Rule-based demo analysis found {object_count} explicitly mentioned "
        f"object{'s' if object_count != 1 else ''} and {people_count} person "
        f"description{'s' if people_count != 1 else ''}. Review each detail against its quoted witness sentence."
    )

    return SceneAnalysisResponse(
        scene_summary=summary,
        location=location or unknown_location,
        lighting=lighting or unknown_lighting,
        objects=list(objects_by_name.values()),
        people_descriptions=list(people_by_name.values()),
        explicit_observations=observations,
        uncertain_details=uncertain_details,
        missing_information=missing_information,
        analysis_mode="demo",
    )


def _cors_origins() -> list[str]:
    configured = os.getenv("TRACE_CORS_ORIGINS", "")
    origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
    if origins:
        return origins
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]


app = FastAPI(
    title="TRACE AI Scene Analysis API",
    description="Rule-based demo analyzer. It is not a live AI model and does not establish evidence.",
    version="0.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", analysis_mode="demo", analyzer="rule_based_demo")


@app.post("/api/analyze-scene", response_model=SceneAnalysisResponse)
def analyze_scene(request: AnalysisRequest) -> SceneAnalysisResponse:
    return analyze_witness_description(request.witness_description)