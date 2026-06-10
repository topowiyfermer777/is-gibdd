from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

# 1. Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    id_employee: int
    role: str
    full_name: str

class TokenData(BaseModel):
    id_employee: Optional[int] = None

# 2. Employee (Сотрудник)
class EmployeeResponse(BaseModel):
    id_employee: int
    last_name: str
    first_name: str
    patronymic: Optional[str] = None
    position: str
    role: str

    class Config:
        from_attributes = True

# 3. Simple Spravka models (для связанных объектов)
class ModelSchema(BaseModel):
    id_model: int
    name: str
    brand_name: str
    manufacturer_name: str
    vehicle_type_name: str

    class Config:
        from_attributes = True

# 4. Vehicle Schemas (АТС)
class VehicleBase(BaseModel):
    vin: str
    body_number: Optional[str] = None
    engine_number: Optional[str] = None
    chassis_number: Optional[str] = None
    id_model: int
    id_color: int
    year_produced: int
    engine_volume: Optional[float] = None

class VehicleCreate(VehicleBase):
    pass

class VehicleResponse(VehicleBase):
    id_vehicle: int
    model_name: str
    brand_name: str
    color_name: str

    class Config:
        from_attributes = True

# 5. Counterparty (Владелец)
class CounterpartyBase(BaseModel):
    name: str
    address: str
    phone: Optional[str] = None
    type: str # individual / legal
    inn: Optional[str] = None

class CounterpartyCreate(CounterpartyBase):
    pass

class CounterpartyResponse(CounterpartyBase):
    id_counterparty: int

    class Config:
        from_attributes = True

# 6. Registration Schema
class RegistrationCreate(BaseModel):
    vin: str
    body_number: Optional[str] = None
    engine_number: Optional[str] = None
    chassis_number: Optional[str] = None
    id_model: int
    id_color: int
    year_produced: int
    engine_volume: Optional[float] = None
    
    owner_name: str
    owner_address: str
    owner_phone: Optional[str] = None
    owner_type: str # individual / legal
    owner_inn: Optional[str] = None
    
    id_grz: int

# 7. Audit Log
class AuditLogResponse(BaseModel):
    id_audit: int
    user_id: int
    role: str
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# 8. Справочники
class TOOrganizationResponse(BaseModel):
    id_to_org: int
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True

class TOOrganizationCreate(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class AccidentTypeResponse(BaseModel):
    id_accident_type: int
    name: str

    class Config:
        from_attributes = True

class AccidentReasonResponse(BaseModel):
    id_accident_reason: int
    name: str

    class Config:
        from_attributes = True

class SearchReasonResponse(BaseModel):
    id_reason: int
    name: str

    class Config:
        from_attributes = True

class ColorResponse(BaseModel):
    id_color: int
    name: str

    class Config:
        from_attributes = True

class BrandResponse(BaseModel):
    id_brand: int
    name: str
    id_manufacturer: int

    class Config:
        from_attributes = True

class GRZResponse(BaseModel):
    id_grz: int
    series: str
    number: str
    status: str

    class Config:
        from_attributes = True

# 9. Техосмотр (Maintenance)
class MaintenanceCreate(BaseModel):
    vin: str
    id_to_org: int
    date_conducted: date
    date_next: Optional[date] = None

class MaintenanceResponse(BaseModel):
    id_to: int
    id_vehicle: int
    id_to_org: int
    date_conducted: date
    date_next: Optional[date] = None
    organization_name: str
    vehicle_vin: str

    class Config:
        from_attributes = True

# 10. Розыск (Wanted / Stolen)
class StolenRequest(BaseModel):
    vin: str
    id_reason: int
    description: Optional[str] = None

class FoundRequest(BaseModel):
    vin: str

class SearchResponse(BaseModel):
    id_search: int
    id_vehicle: int
    vin: str
    brand_name: str
    model_name: str
    grz_number: Optional[str] = None
    reason_name: str
    date_declared: datetime
    id_employee: int
    employee_name: str
    is_found: bool
    date_found: Optional[datetime] = None

    class Config:
        from_attributes = True

# 11. ДТП (Accidents)
class AccidentParticipantCreate(BaseModel):
    vin: str
    damage_amount: Optional[float] = 0.0
    damage_degree: Optional[str] = None

class AccidentCreate(BaseModel):
    date_time: Optional[datetime] = None
    location: str
    id_accident_type: int
    id_accident_reason: int
    weather_road_conditions: Optional[str] = None
    injured_count: Optional[int] = 0
    description: Optional[str] = None
    participants: List[AccidentParticipantCreate]

class AccidentParticipantResponse(BaseModel):
    id_vehicle: int
    vin: str
    brand_name: str
    model_name: str
    grz_number: Optional[str] = None
    damage_amount: float
    damage_degree: Optional[str] = None

    class Config:
        from_attributes = True

class AccidentResponse(BaseModel):
    id_accident: int
    date_time: datetime
    location: str
    accident_type_name: str
    accident_reason_name: str
    weather_road_conditions: Optional[str] = None
    injured_count: int
    description: Optional[str] = None
    employee_name: str
    participants: List[AccidentParticipantResponse]

    class Config:
        from_attributes = True

# 12. Регистрация и Снятие с учета
class DeregisterRequest(BaseModel):
    vin: str

class RegistrationResponse(BaseModel):
    id_registration: int
    id_vehicle: int
    vin: str
    brand_name: str
    model_name: str
    color_name: str
    grz: str
    owner_name: str
    owner_address: str
    owner_phone: Optional[str] = None
    owner_type: str
    owner_inn: Optional[str] = None
    date_registered: date
    is_deregistered: bool
    date_deregistered: Optional[date] = None

    class Config:
        from_attributes = True

# 13. Проверка АТС (Vehicle Universal Search)
class VehicleCheckTOHistory(BaseModel):
    date_conducted: date
    date_next: Optional[date] = None
    organization_name: str

class VehicleCheckAccidentHistory(BaseModel):
    date_time: datetime
    location: str
    accident_type: str
    description: Optional[str] = None
    damage_degree: Optional[str] = None

class VehicleCheckResponse(BaseModel):
    id_vehicle: int
    vin: str
    body_number: Optional[str] = None
    engine_number: Optional[str] = None
    chassis_number: Optional[str] = None
    brand_name: str
    model_name: str
    color_name: str
    year_produced: int
    engine_volume: Optional[float] = None
    
    registration_status: str # "Зарегистрировано" / "Снято с учета" / "Не зарегистрировано"
    grz_number: Optional[str] = None
    
    owner_name: Optional[str] = None
    owner_address: Optional[str] = None
    owner_phone: Optional[str] = None
    owner_type: Optional[str] = None
    owner_inn: Optional[str] = None
    
    is_stolen: bool
    stolen_reason: Optional[str] = None
    stolen_date: Optional[datetime] = None
    
    to_history: List[VehicleCheckTOHistory]
    accident_history: List[VehicleCheckAccidentHistory]

    class Config:
        from_attributes = True

# 14. Отчетность и Аналитика
class TheftStatsBrandDetail(BaseModel):
    brand: str
    count: int

class TheftStatsResponse(BaseModel):
    total_vehicles: int
    total_stolen_active: int
    by_brand: List[TheftStatsBrandDetail]

