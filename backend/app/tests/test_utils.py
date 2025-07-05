from datetime import datetime, timedelta
from typing import List
from models.schemas import Employee, Shift, Availability
from models.api_models import ShiftScheduleResponse

def print_metrics(response: ShiftScheduleResponse) -> None:
    if hasattr(response, 'metrics') and response.metrics:
        print("METRICS:", response.metrics)

def create_employee(
    emp_id: str,
    skills: List[str],
    max_hours: int,
    avail_start_offset: int,
    avail_duration: int,
    base_datetime: datetime = None
) -> Employee:
    start_time = base_datetime + timedelta(hours=avail_start_offset)
    end_time = start_time + timedelta(hours=avail_duration)
    return Employee(
        id=emp_id,
        name=f"Employee {emp_id}",
        skills=skills,
        max_hours=max_hours,
        availability=Availability(
            start=start_time,
            end=end_time
        )
    )

def create_shift(
    shift_id: str,
    required_skill: str,
    start_offset_hours: int,
    duration_hours: int,
    base_datetime: datetime = None
) -> Shift:
    start_time = base_datetime + timedelta(hours=start_offset_hours)
    end_time = start_time + timedelta(hours=duration_hours)
    return Shift(
        id=shift_id,
        role=f"Role for {required_skill}",
        start_time=start_time,
        end_time=end_time,
        required_skill=required_skill
    )
