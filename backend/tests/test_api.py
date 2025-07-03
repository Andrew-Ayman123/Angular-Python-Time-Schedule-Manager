"""
Tests for the schedule optimization API endpoints.

This module contains integration tests for the FastAPI endpoints
to ensure proper functionality and response formats.
"""

import pytest
from fastapi import status


def test_root_endpoint(client):
    """Test the root endpoint returns correct information."""
    response = client.get("/")
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert data["message"] == "Schedule Optimization API"
    assert "version" in data
    assert "docs" in data
    assert "health" in data


def test_health_check_endpoint(client):
    """Test the health check endpoint."""
    response = client.get("/api/health")
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert "status" in data
    assert "timestamp" in data
    assert "version" in data
    assert "dependencies" in data


def test_optimize_schedule_endpoint(client, sample_optimization_request):
    """Test the schedule optimization endpoint with valid input."""
    request_data = sample_optimization_request.dict()
    
    # Convert datetime objects to ISO strings for JSON serialization
    request_data["employees"][0]["availability"]["start"] = "2025-07-01T08:00:00"
    request_data["employees"][0]["availability"]["end"] = "2025-07-14T22:00:00"
    request_data["shifts"][0]["start_time"] = "2025-07-01T09:00:00"
    request_data["shifts"][0]["end_time"] = "2025-07-01T17:00:00"
    
    response = client.post("/api/schedule/optimize", json=request_data)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert "success" in data
    assert "assignments" in data
    assert "unassigned_shifts" in data
    assert "metrics" in data
    assert "constraints_applied" in data


def test_optimize_schedule_invalid_period(client, sample_optimization_request):
    """Test optimization endpoint with invalid period format."""
    request_data = sample_optimization_request.dict()
    request_data["period"] = "invalid-period"
    
    response = client.post("/api/schedule/optimize", json=request_data)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_optimize_schedule_empty_employees(client, sample_optimization_request):
    """Test optimization endpoint with empty employees list."""
    request_data = sample_optimization_request.dict()
    request_data["employees"] = []
    
    response = client.post("/api/schedule/optimize", json=request_data)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_optimize_schedule_empty_shifts(client, sample_optimization_request):
    """Test optimization endpoint with empty shifts list."""
    request_data = sample_optimization_request.dict()
    request_data["shifts"] = []
    
    response = client.post("/api/schedule/optimize", json=request_data)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
