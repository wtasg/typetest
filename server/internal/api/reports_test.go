package api

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCORSOriginValidation(t *testing.T) {
	handler := cors(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Test 1: Localhost origin allowed by default
	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	req.Header.Set("Origin", "http://localhost:30002")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:30002" {
		t.Errorf("expected CORS header http://localhost:30002, got %q", got)
	}

	// Test 2: Arbitrary untrusted origin rejected by default
	req2 := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	req2.Header.Set("Origin", "http://malicious-site.com")
	rec2 := httptest.NewRecorder()
	handler.ServeHTTP(rec2, req2)

	if got := rec2.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("expected empty CORS header for untrusted origin, got %q", got)
	}
}

func TestReadJSONBodyLimit(t *testing.T) {
	// Generate payload > 5MB
	largePayload := "{\"id\":\"" + strings.Repeat("A", 6*1024*1024) + "\"}"
	req := httptest.NewRequest(http.MethodPost, "/api/sources", strings.NewReader(largePayload))
	rec := httptest.NewRecorder()

	var dummy sourceRow
	err := readJSON(rec, req, &dummy)
	if err == nil {
		t.Fatal("expected error when body exceeds 5MB, got nil")
	}
}

func TestCreateRunPayloadParsing(t *testing.T) {
	// Test valid JSON payload unmarshaling
	payload := `{
		"id": "run-uuid-1",
		"startedAt": "2026-08-12T12:00:00Z",
		"durationMs": 15000,
		"status": "COMPLETED",
		"configuration": {"gameType": "normal"},
		"target": "hello world",
		"events": [],
		"metrics": {
			"raw": {"rawWPM": 60, "totalKeystrokes": 120},
			"effective": {"effectiveWPM": 58, "accuracy": 98, "correctChars": 115}
		}
	}`

	req := httptest.NewRequest(http.MethodPost, "/api/runs", bytes.NewBufferString(payload))
	rec := httptest.NewRecorder()

	// Call createRun with nil DB (should return 204 No Content safely without panic)
	createRun(rec, req, nil)

	if rec.Code != http.StatusNoContent {
		t.Errorf("expected status 204 No Content for nil DB, got %d", rec.Code)
	}
}
