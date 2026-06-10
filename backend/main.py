from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime, date
from typing import List, Optional
import logging

from database import (
    engine, Base, get_db, SessionLocal, Employee, AuditLog,
    Manufacturer, Brand, Model, VehicleType, Color, GRZ,
    SearchReason, AccidentType, AccidentReason, TOOrganization,
    Counterparty, Vehicle, Registration, Search, Found, TO,
    Accident, AccidentParticipant, Deregistration
)
from auth import verify_password, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES, RoleChecker
import schemas
from seed import seed_db

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("gibdd_app")

# Initialize database tables and seed initial data
logger.info("Initializing database...")
seed_db()

app = FastAPI(
    title="Информационная система ГИБДД",
    description="REST API для информационной системы ГИБДД (Учебный проект)",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for local testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. POST /api/auth/login (OAuth2 compatible login)
@app.post("/api/auth/login", response_model=schemas.Token, summary="Авторизация сотрудника")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Username is treated as id_employee
    try:
        emp_id = int(form_data.username)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Табельный номер должен быть числом"
        )
        
    employee = db.query(Employee).filter(Employee.id_employee == emp_id).first()
    if not employee or not verify_password(form_data.password, employee.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный табельный номер или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(employee.id_employee)}, expires_delta=access_token_expires
    )
    
    # Log login action to audit
    audit = AuditLog(
        user_id=employee.id_employee,
        role=employee.role,
        action="LOGIN",
        entity_type="Employee",
        entity_id=employee.id_employee,
        details=f"Сотрудник {employee.last_name} {employee.first_name} вошел в систему"
    )
    db.add(audit)
    db.commit()
    
    full_name = f"{employee.last_name} {employee.first_name}"
    if employee.patronymic:
        full_name += f" {employee.patronymic}"
        
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "id_employee": employee.id_employee,
        "role": employee.role,
        "full_name": full_name
    }

# 2. GET /api/auth/me (Protected profile check)
@app.get("/api/auth/me", response_model=schemas.EmployeeResponse, summary="Получить профиль текущего сотрудника")
def get_me(current_user: Employee = Depends(get_current_user)):
    return current_user

# Helper function for background audit logging
def log_audit_background(user_id: int, role: str, action: str, entity_type: Optional[str], entity_id: Optional[int], details: str):
    db = SessionLocal()
    try:
        audit = AuditLog(
            user_id=user_id,
            role=role,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details
        )
        db.add(audit)
        db.commit()
        logger.info(f"Audit log created: {action} by user {user_id}")
    except Exception as e:
        logger.error(f"Failed to write audit log: {e}")
    finally:
        db.close()

# 3. GET / (Healthcheck)
@app.get("/", summary="Healthcheck")
def read_root():
    return {"status": "ok", "message": "Информационная система ГИБДД работает"}

# 4. Справочные эндпоинты
@app.get("/api/grz/free", response_model=List[schemas.GRZResponse], summary="Получить список свободных ГРЗ")
def get_free_grz(db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    return db.query(GRZ).filter(GRZ.status == "free").all()

@app.get("/api/models", response_model=List[schemas.ModelSchema], summary="Получить список моделей автомобилей")
def get_models(db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    models = db.query(Model).all()
    res = []
    for m in models:
        res.append(schemas.ModelSchema(
            id_model=m.id_model,
            name=m.name,
            brand_name=m.brand.name if m.brand else "",
            manufacturer_name=m.brand.manufacturer.name if (m.brand and m.brand.manufacturer) else "",
            vehicle_type_name=m.vehicle_type.name if m.vehicle_type else ""
        ))
    return res

@app.get("/api/colors", response_model=List[schemas.ColorResponse], summary="Получить список цветов")
def get_colors(db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    return db.query(Color).all()

@app.get("/api/to-organizations", response_model=List[schemas.TOOrganizationResponse], summary="Получить список организаций ТО")
def get_to_organizations(db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    return db.query(TOOrganization).all()

@app.get("/api/accident-types", response_model=List[schemas.AccidentTypeResponse], summary="Получить список типов ДТП")
def get_accident_types(db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    return db.query(AccidentType).all()

@app.get("/api/accident-reasons", response_model=List[schemas.AccidentReasonResponse], summary="Получить список причин ДТП")
def get_accident_reasons(db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    return db.query(AccidentReason).all()

@app.get("/api/search-reasons", response_model=List[schemas.SearchReasonResponse], summary="Получить список причин розыска")
def get_search_reasons(db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    return db.query(SearchReason).all()

# 5. Поиск и проверка АТС (UC-01)
@app.get("/api/vehicles/search", response_model=schemas.VehicleCheckResponse, summary="Универсальный поиск АТС")
def search_vehicle(
    query: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    # Convert Latin to Cyrillic homoglyphs to handle layout mismatches
    latin_to_cyrillic = {
        'A': 'А', 'B': 'В', 'C': 'С', 'E': 'Е', 'H': 'Н', 'K': 'К',
        'M': 'М', 'O': 'О', 'P': 'Р', 'T': 'Т', 'X': 'Х', 'Y': 'У'
    }
    std_query = "".join(latin_to_cyrillic.get(c, c) for c in query.upper())
    norm_query = std_query.replace(" ", "").replace("-", "")
    
    # Search by VIN, engine number, or body number
    vehicle = db.query(Vehicle).filter(
        (Vehicle.vin.like(f"%{query}%")) | 
        (Vehicle.vin.like(f"%{norm_query}%")) | 
        (Vehicle.engine_number.like(f"%{query}%")) | 
        (Vehicle.body_number.like(f"%{query}%"))
    ).first()
    
    # Search by GRZ
    if not vehicle:
        from sqlalchemy import func
        db_series_clean = func.replace(func.replace(GRZ.series, '-', ''), ' ', '')
        db_number_clean = func.replace(GRZ.number, ' ', '')
        db_grz_clean = db_series_clean.concat(db_number_clean)
        db_grz_std = func.substr(db_series_clean, 1, 1).concat(db_number_clean).concat(func.substr(db_series_clean, 2))
        
        grz = db.query(GRZ).filter(
            (GRZ.series.like(f"%{std_query}%")) | 
            (GRZ.number.like(f"%{std_query}%")) |
            (db_grz_clean.like(f"%{norm_query}%")) |
            (db_grz_std.like(f"%{norm_query}%"))
        ).first()
        if grz and grz.registration:
            vehicle = grz.registration.vehicle

    if not vehicle:
        background_tasks.add_task(
            log_audit_background,
            current_user.id_employee,
            current_user.role,
            "SEARCH_VEHICLE",
            "Vehicle",
            None,
            f"Неудачный поиск АТС по запросу: {query}"
        )
        raise HTTPException(status_code=404, detail="АТС не найдено в базе данных")
    
    # Registration info
    registration = db.query(Registration).filter(Registration.id_vehicle == vehicle.id_vehicle).order_by(Registration.id_registration.desc()).first()
    
    reg_status = "Не зарегистрировано"
    grz_str = None
    owner = None
    
    if registration:
        dereg = db.query(Deregistration).filter(Deregistration.id_registration == registration.id_registration).first()
        if dereg:
            reg_status = "Снято с учета"
        else:
            reg_status = "Зарегистрировано"
        grz_str = f"{registration.grz.series} {registration.grz.number}"
        owner = registration.counterparty

    # Active search info
    active_search = db.query(Search).filter(
        Search.id_vehicle == vehicle.id_vehicle
    ).outerjoin(Found).filter(Found.id_search == None).order_by(Search.id_search.desc()).first()
    
    is_stolen = active_search is not None
    stolen_reason = active_search.reason.name if active_search else None
    stolen_date = active_search.date_declared if active_search else None
    
    # Mask personal data based on role
    mask_data = current_user.role in ["inspector", "to_employee"]
    
    owner_name = None
    owner_address = None
    owner_phone = None
    owner_type = None
    owner_inn = None
    
    if owner:
        owner_type = owner.type
        if mask_data:
            if owner.type == "individual":
                parts = owner.name.split()
                if len(parts) >= 3:
                    owner_name = f"{parts[0]} {parts[1][0]}.{parts[2][0]}."
                elif len(parts) == 2:
                    owner_name = f"{parts[0]} {parts[1][0]}."
                else:
                    owner_name = f"{owner.name[0]}***"
            else:
                owner_name = owner.name[:5] + "***" if len(owner.name) > 5 else owner.name
            
            owner_address = "Замаскировано (конфиденциальные данные)"
            owner_phone = owner.phone[:4] + "***" if owner.phone else None
            owner_inn = owner.inn[:3] + "***" if owner.inn else None
        else:
            owner_name = owner.name
            owner_address = owner.address
            owner_phone = owner.phone
            owner_inn = owner.inn

    # TO history
    to_records = db.query(TO).filter(TO.id_vehicle == vehicle.id_vehicle).order_by(TO.date_conducted.desc()).all()
    to_history = []
    for to_rec in to_records:
        to_history.append(schemas.VehicleCheckTOHistory(
            date_conducted=to_rec.date_conducted,
            date_next=to_rec.date_next,
            organization_name=to_rec.organization.name if to_rec.organization else ""
        ))
        
    # Accident history
    accident_parts = db.query(AccidentParticipant).filter(AccidentParticipant.id_vehicle == vehicle.id_vehicle).all()
    accident_history = []
    for part in accident_parts:
        acc = part.accident
        if acc:
            accident_history.append(schemas.VehicleCheckAccidentHistory(
                date_time=acc.date_time,
                location=acc.location,
                accident_type=acc.accident_type.name if acc.accident_type else "",
                description=acc.description,
                damage_degree=part.damage_degree
            ))
            
    # Audit log entry
    background_tasks.add_task(
        log_audit_background,
        current_user.id_employee,
        current_user.role,
        "SEARCH_VEHICLE",
        "Vehicle",
        vehicle.id_vehicle,
        f"Поиск АТС VIN={vehicle.vin}, ГРЗ={grz_str or 'нет'}, Статус={reg_status}, В розыске={is_stolen}"
    )

    return schemas.VehicleCheckResponse(
        id_vehicle=vehicle.id_vehicle,
        vin=vehicle.vin,
        body_number=vehicle.body_number,
        engine_number=vehicle.engine_number,
        chassis_number=vehicle.chassis_number,
        brand_name=vehicle.model.brand.name if (vehicle.model and vehicle.model.brand) else "",
        model_name=vehicle.model.name if vehicle.model else "",
        color_name=vehicle.color.name if vehicle.color else "",
        year_produced=vehicle.year_produced,
        engine_volume=vehicle.engine_volume,
        registration_status=reg_status,
        grz_number=grz_str,
        owner_name=owner_name,
        owner_address=owner_address,
        owner_phone=owner_phone,
        owner_type=owner_type,
        owner_inn=owner_inn,
        is_stolen=is_stolen,
        stolen_reason=stolen_reason,
        stolen_date=stolen_date,
        to_history=to_history,
        accident_history=accident_history
    )

# 6. Регистрация АТС (UC-02)
@app.post("/api/vehicles/register", response_model=schemas.RegistrationResponse, summary="Регистрация нового АТС")
def register_vehicle(
    payload: schemas.RegistrationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(RoleChecker(["registrar", "admin"]))
):
    # Check if VIN is wanted/stolen
    search_alert = db.query(Search).join(Vehicle).filter(
        Vehicle.vin == payload.vin
    ).outerjoin(Found).filter(Found.id_search == None).first()
    
    if search_alert:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Регистрация заблокирована: АТС находится в розыске!"
        )

    # Check active registration
    existing_vehicle = db.query(Vehicle).filter(Vehicle.vin == payload.vin).first()
    if existing_vehicle:
        active_reg = db.query(Registration).filter(
            Registration.id_vehicle == existing_vehicle.id_vehicle
        ).outerjoin(Deregistration).filter(Deregistration.id_registration == None).first()
        
        if active_reg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"АТС с таким VIN уже имеет активную регистрацию (ГРЗ: {active_reg.grz.series} {active_reg.grz.number})"
            )

    # Check GRZ status
    grz_record = db.query(GRZ).filter(GRZ.id_grz == payload.id_grz).first()
    if not grz_record or grz_record.status != "free":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Выбранный ГРЗ занят или не существует"
        )

    # Find or create Counterparty
    owner = db.query(Counterparty).filter(
        Counterparty.name == payload.owner_name,
        Counterparty.type == payload.owner_type,
        Counterparty.inn == payload.owner_inn
    ).first()
    
    if not owner:
        owner = Counterparty(
            name=payload.owner_name,
            address=payload.owner_address,
            phone=payload.owner_phone,
            type=payload.owner_type,
            inn=payload.owner_inn
        )
        db.add(owner)
        db.flush()

    # Find or create Vehicle
    vehicle = existing_vehicle
    if not vehicle:
        vehicle = Vehicle(
            vin=payload.vin,
            body_number=payload.body_number,
            engine_number=payload.engine_number,
            chassis_number=payload.chassis_number,
            id_model=payload.id_model,
            id_color=payload.id_color,
            year_produced=payload.year_produced,
            engine_volume=payload.engine_volume
        )
        db.add(vehicle)
        db.flush()

    # Create Registration
    reg = Registration(
        id_vehicle=vehicle.id_vehicle,
        id_counterparty=owner.id_counterparty,
        id_grz=grz_record.id_grz,
        id_employee=current_user.id_employee,
        date_registered=date.today()
    )
    db.add(reg)
    
    grz_record.status = "issued"
    db.commit()
    db.refresh(reg)

    # Log action
    grz_str = f"{grz_record.series} {grz_record.number}"
    background_tasks.add_task(
        log_audit_background,
        current_user.id_employee,
        current_user.role,
        "REGISTER_VEHICLE",
        "Registration",
        reg.id_registration,
        f"Зарегистрировано АТС VIN={vehicle.vin}, ГРЗ={grz_str}, Владелец={owner.name}"
    )

    return schemas.RegistrationResponse(
        id_registration=reg.id_registration,
        id_vehicle=vehicle.id_vehicle,
        vin=vehicle.vin,
        brand_name=vehicle.model.brand.name if (vehicle.model and vehicle.model.brand) else "",
        model_name=vehicle.model.name if vehicle.model else "",
        color_name=vehicle.color.name if vehicle.color else "",
        grz=grz_str,
        owner_name=owner.name,
        owner_address=owner.address,
        owner_phone=owner.phone,
        owner_type=owner.type,
        owner_inn=owner.inn,
        date_registered=reg.date_registered,
        is_deregistered=False,
        date_deregistered=None
    )

@app.post("/api/vehicles/deregister", response_model=schemas.RegistrationResponse, summary="Снятие АТС с учета")
def deregister_vehicle(
    payload: schemas.DeregisterRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(RoleChecker(["registrar", "admin"]))
):
    vehicle = db.query(Vehicle).filter(Vehicle.vin == payload.vin).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="АТС с таким VIN не найдено")

    reg = db.query(Registration).filter(
        Registration.id_vehicle == vehicle.id_vehicle
    ).outerjoin(Deregistration).filter(Deregistration.id_registration == None).first()

    if not reg:
        raise HTTPException(status_code=400, detail="У этого АТС нет активных регистраций")

    dereg = Deregistration(
        id_registration=reg.id_registration,
        date_deregistered=date.today(),
        id_employee=current_user.id_employee
    )
    db.add(dereg)

    grz_record = reg.grz
    if grz_record:
        grz_record.status = "free"

    db.commit()
    db.refresh(reg)

    grz_str = f"{grz_record.series} {grz_record.number}" if grz_record else "нет"
    background_tasks.add_task(
        log_audit_background,
        current_user.id_employee,
        current_user.role,
        "DEREGISTER_VEHICLE",
        "Registration",
        reg.id_registration,
        f"Снято с учета АТС VIN={vehicle.vin}, освобожден ГРЗ={grz_str}"
    )

    return schemas.RegistrationResponse(
        id_registration=reg.id_registration,
        id_vehicle=vehicle.id_vehicle,
        vin=vehicle.vin,
        brand_name=vehicle.model.brand.name if (vehicle.model and vehicle.model.brand) else "",
        model_name=vehicle.model.name if vehicle.model else "",
        color_name=vehicle.color.name if vehicle.color else "",
        grz=grz_str,
        owner_name=reg.counterparty.name,
        owner_address=reg.counterparty.address,
        owner_phone=reg.counterparty.phone,
        owner_type=reg.counterparty.type,
        owner_inn=reg.counterparty.inn,
        date_registered=reg.date_registered,
        is_deregistered=True,
        date_deregistered=dereg.date_deregistered
    )

@app.get("/api/registrations", response_model=List[schemas.RegistrationResponse], summary="Список регистраций")
def list_registrations(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(RoleChecker(["registrar", "analyst", "admin"]))
):
    regs = db.query(Registration).all()
    res = []
    for r in regs:
        dereg = r.deregistration
        grz_str = f"{r.grz.series} {r.grz.number}" if r.grz else ""
        res.append(schemas.RegistrationResponse(
            id_registration=r.id_registration,
            id_vehicle=r.id_vehicle,
            vin=r.vehicle.vin,
            brand_name=r.vehicle.model.brand.name if (r.vehicle.model and r.vehicle.model.brand) else "",
            model_name=r.vehicle.model.name if r.vehicle.model else "",
            color_name=r.vehicle.color.name if r.vehicle.color else "",
            grz=grz_str,
            owner_name=r.counterparty.name,
            owner_address=r.counterparty.address,
            owner_phone=r.counterparty.phone,
            owner_type=r.counterparty.type,
            owner_inn=r.counterparty.inn,
            date_registered=r.date_registered,
            is_deregistered=dereg is not None,
            date_deregistered=dereg.date_deregistered if dereg else None
        ))
    return res

# 7. Реестр розыска (UC-03)
@app.post("/api/vehicles/stolen", response_model=schemas.SearchResponse, summary="Объявить АТС в розыск")
def declare_stolen(
    payload: schemas.StolenRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(RoleChecker(["inspector", "admin"]))
):
    vehicle = db.query(Vehicle).filter(Vehicle.vin == payload.vin).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="АТС с таким VIN не найдено")

    active_search = db.query(Search).filter(
        Search.id_vehicle == vehicle.id_vehicle
    ).outerjoin(Found).filter(Found.id_search == None).first()

    if active_search:
        raise HTTPException(status_code=400, detail="АТС уже находится в розыске")

    reason = db.query(SearchReason).filter(SearchReason.id_reason == payload.id_reason).first()
    if not reason:
        raise HTTPException(status_code=400, detail="Указанная причина розыска не существует")

    search = Search(
        id_vehicle=vehicle.id_vehicle,
        id_reason=payload.id_reason,
        date_declared=datetime.now(),
        id_employee=current_user.id_employee
    )
    db.add(search)
    db.commit()
    db.refresh(search)

    reg = db.query(Registration).filter(
        Registration.id_vehicle == vehicle.id_vehicle
    ).outerjoin(Deregistration).filter(Deregistration.id_registration == None).first()
    grz_str = f"{reg.grz.series} {reg.grz.number}" if (reg and reg.grz) else None

    background_tasks.add_task(
        log_audit_background,
        current_user.id_employee,
        current_user.role,
        "STOLEN_VEHICLE",
        "Search",
        search.id_search,
        f"Объявлено в розыск АТС VIN={vehicle.vin}, Причина={reason.name}, Описание: {payload.description or 'нет'}"
    )

    emp_name = f"{current_user.last_name} {current_user.first_name[0]}."
    if current_user.patronymic:
        emp_name += f"{current_user.patronymic[0]}."

    return schemas.SearchResponse(
        id_search=search.id_search,
        id_vehicle=vehicle.id_vehicle,
        vin=vehicle.vin,
        brand_name=vehicle.model.brand.name if (vehicle.model and vehicle.model.brand) else "",
        model_name=vehicle.model.name if vehicle.model else "",
        grz_number=grz_str,
        reason_name=reason.name,
        date_declared=search.date_declared,
        id_employee=current_user.id_employee,
        employee_name=emp_name,
        is_found=False,
        date_found=None
    )

@app.post("/api/vehicles/found", response_model=schemas.SearchResponse, summary="Отметить АТС как найденное")
def mark_found(
    payload: schemas.FoundRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(RoleChecker(["inspector", "admin"]))
):
    vehicle = db.query(Vehicle).filter(Vehicle.vin == payload.vin).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="АТС с таким VIN не найдено")

    search = db.query(Search).filter(
        Search.id_vehicle == vehicle.id_vehicle
    ).outerjoin(Found).filter(Found.id_search == None).order_by(Search.id_search.desc()).first()

    if not search:
        raise HTTPException(status_code=400, detail="Это АТС не числится в розыске")

    found = Found(
        id_search=search.id_search,
        date_found=datetime.now()
    )
    db.add(found)
    db.commit()
    db.refresh(search)

    background_tasks.add_task(
        log_audit_background,
        current_user.id_employee,
        current_user.role,
        "FOUND_VEHICLE",
        "Search",
        search.id_search,
        f"Снят розыск АТС VIN={vehicle.vin}, обнаружено."
    )

    reg = db.query(Registration).filter(
        Registration.id_vehicle == vehicle.id_vehicle
    ).outerjoin(Deregistration).filter(Deregistration.id_registration == None).first()
    grz_str = f"{reg.grz.series} {reg.grz.number}" if (reg and reg.grz) else None

    decl_employee = db.query(Employee).filter(Employee.id_employee == search.id_employee).first()
    emp_name = "Неизвестно"
    if decl_employee:
        emp_name = f"{decl_employee.last_name} {decl_employee.first_name[0]}."
        if decl_employee.patronymic:
            emp_name += f"{decl_employee.patronymic[0]}."

    return schemas.SearchResponse(
        id_search=search.id_search,
        id_vehicle=vehicle.id_vehicle,
        vin=vehicle.vin,
        brand_name=vehicle.model.brand.name if (vehicle.model and vehicle.model.brand) else "",
        model_name=vehicle.model.name if vehicle.model else "",
        grz_number=grz_str,
        reason_name=search.reason.name,
        date_declared=search.date_declared,
        id_employee=search.id_employee,
        employee_name=emp_name,
        is_found=True,
        date_found=found.date_found
    )

@app.get("/api/searches", response_model=List[schemas.SearchResponse], summary="Список розысков")
def list_searches(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    searches = db.query(Search).order_by(Search.date_declared.desc()).all()
    res = []
    for s in searches:
        is_found = s.found is not None
        reg = db.query(Registration).filter(
            Registration.id_vehicle == s.id_vehicle
        ).outerjoin(Deregistration).filter(Deregistration.id_registration == None).first()
        grz_str = f"{reg.grz.series} {reg.grz.number}" if (reg and reg.grz) else None
        
        emp = s.employee
        emp_name = f"{emp.last_name} {emp.first_name[0]}." if emp else "Неизвестно"
        if emp and emp.patronymic:
            emp_name += f"{emp.patronymic[0]}."
            
        res.append(schemas.SearchResponse(
            id_search=s.id_search,
            id_vehicle=s.id_vehicle,
            vin=s.vehicle.vin,
            brand_name=s.vehicle.model.brand.name if (s.vehicle.model and s.vehicle.model.brand) else "",
            model_name=s.vehicle.model.name if s.vehicle.model else "",
            grz_number=grz_str,
            reason_name=s.reason.name,
            date_declared=s.date_declared,
            id_employee=s.id_employee,
            employee_name=emp_name,
            is_found=is_found,
            date_found=s.found.date_found if is_found else None
        ))
    return res

# 8. Технический осмотр (UC-04)
@app.post("/api/to-organizations", response_model=schemas.TOOrganizationResponse, summary="Добавить организацию ТО")
def create_to_org(
    payload: schemas.TOOrganizationCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(RoleChecker(["to_employee", "admin"]))
):
    org = TOOrganization(
        name=payload.name,
        address=payload.address,
        phone=payload.phone,
        email=payload.email
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return org

@app.post("/api/maintenance", response_model=schemas.MaintenanceResponse, summary="Внести техосмотр")
def create_maintenance(
    payload: schemas.MaintenanceCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(RoleChecker(["to_employee", "admin"]))
):
    vehicle = db.query(Vehicle).filter(Vehicle.vin == payload.vin).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="АТС с таким VIN не найдено")

    org = db.query(TOOrganization).filter(TOOrganization.id_to_org == payload.id_to_org).first()
    if not org:
        raise HTTPException(status_code=400, detail="Организация ТО не найдена")

    to_rec = TO(
        id_vehicle=vehicle.id_vehicle,
        id_to_org=payload.id_to_org,
        date_conducted=payload.date_conducted,
        date_next=payload.date_next
    )
    db.add(to_rec)
    db.commit()
    db.refresh(to_rec)

    background_tasks.add_task(
        log_audit_background,
        current_user.id_employee,
        current_user.role,
        "CREATE_TO",
        "TO",
        to_rec.id_to,
        f"Внесено прохождение ТО для АТС VIN={vehicle.vin}, Организация={org.name}, Дата={payload.date_conducted}"
    )

    return schemas.MaintenanceResponse(
        id_to=to_rec.id_to,
        id_vehicle=to_rec.id_vehicle,
        id_to_org=to_rec.id_to_org,
        date_conducted=to_rec.date_conducted,
        date_next=to_rec.date_next,
        organization_name=org.name,
        vehicle_vin=vehicle.vin
    )

# 9. Учет ДТП
@app.post("/api/accidents", response_model=schemas.AccidentResponse, summary="Оформить ДТП")
def create_accident(
    payload: schemas.AccidentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(RoleChecker(["inspector", "admin"]))
):
    acc_type = db.query(AccidentType).filter(AccidentType.id_accident_type == payload.id_accident_type).first()
    if not acc_type:
        raise HTTPException(status_code=400, detail="Указанный тип ДТП не существует")

    reason = db.query(AccidentReason).filter(AccidentReason.id_accident_reason == payload.id_accident_reason).first()
    if not reason:
        raise HTTPException(status_code=400, detail="Указанная причина ДТП не существует")

    acc = Accident(
        date_time=payload.date_time or datetime.now(),
        location=payload.location,
        id_accident_type=payload.id_accident_type,
        id_accident_reason=payload.id_accident_reason,
        weather_road_conditions=payload.weather_road_conditions,
        injured_count=payload.injured_count,
        description=payload.description,
        id_employee=current_user.id_employee
    )
    db.add(acc)
    db.flush()

    participant_responses = []
    for part in payload.participants:
        vehicle = db.query(Vehicle).filter(Vehicle.vin == part.vin).first()
        if not vehicle:
            raise HTTPException(status_code=404, detail=f"Участник ДТП: АТС с VIN {part.vin} не найдено в базе данных")
            
        p_rec = AccidentParticipant(
            id_accident=acc.id_accident,
            id_vehicle=vehicle.id_vehicle,
            damage_amount=part.damage_amount or 0.0,
            damage_degree=part.damage_degree
        )
        db.add(p_rec)
        
        reg = db.query(Registration).filter(
            Registration.id_vehicle == vehicle.id_vehicle
        ).outerjoin(Deregistration).filter(Deregistration.id_registration == None).first()
        grz_str = f"{reg.grz.series} {reg.grz.number}" if (reg and reg.grz) else None
        
        participant_responses.append(schemas.AccidentParticipantResponse(
            id_vehicle=vehicle.id_vehicle,
            vin=vehicle.vin,
            brand_name=vehicle.model.brand.name if (vehicle.model and vehicle.model.brand) else "",
            model_name=vehicle.model.name if vehicle.model else "",
            grz_number=grz_str,
            damage_amount=part.damage_amount or 0.0,
            damage_degree=part.damage_degree
        ))

    db.commit()
    db.refresh(acc)

    background_tasks.add_task(
        log_audit_background,
        current_user.id_employee,
        current_user.role,
        "CREATE_ACCIDENT",
        "Accident",
        acc.id_accident,
        f"Оформило ДТП по адресу: {acc.location}, Участников: {len(payload.participants)}"
    )

    emp_name = f"{current_user.last_name} {current_user.first_name[0]}."
    if current_user.patronymic:
        emp_name += f"{current_user.patronymic[0]}."

    return schemas.AccidentResponse(
        id_accident=acc.id_accident,
        date_time=acc.date_time,
        location=acc.location,
        accident_type_name=acc_type.name,
        accident_reason_name=reason.name,
        weather_road_conditions=acc.weather_road_conditions,
        injured_count=acc.injured_count,
        description=acc.description,
        employee_name=emp_name,
        participants=participant_responses
    )

@app.get("/api/accidents", response_model=List[schemas.AccidentResponse], summary="Список ДТП")
def list_accidents(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    accs = db.query(Accident).order_by(Accident.date_time.desc()).all()
    res = []
    for acc in accs:
        emp = acc.employee
        emp_name = f"{emp.last_name} {emp.first_name[0]}." if emp else "Неизвестно"
        if emp and emp.patronymic:
            emp_name += f"{emp.patronymic[0]}."
            
        parts = []
        for part in acc.participants:
            veh = part.vehicle
            reg = db.query(Registration).filter(
                Registration.id_vehicle == veh.id_vehicle
            ).outerjoin(Deregistration).filter(Deregistration.id_registration == None).first()
            grz_str = f"{reg.grz.series} {reg.grz.number}" if (reg and reg.grz) else None
            
            parts.append(schemas.AccidentParticipantResponse(
                id_vehicle=veh.id_vehicle,
                vin=veh.vin,
                brand_name=veh.model.brand.name if (veh.model and veh.model.brand) else "",
                model_name=veh.model.name if veh.model else "",
                grz_number=grz_str,
                damage_amount=part.damage_amount,
                damage_degree=part.damage_degree
            ))
            
        res.append(schemas.AccidentResponse(
            id_accident=acc.id_accident,
            date_time=acc.date_time,
            location=acc.location,
            accident_type_name=acc.accident_type.name if acc.accident_type else "Неизвестно",
            accident_reason_name=acc.accident_reason.name if acc.accident_reason else "Неизвестно",
            weather_road_conditions=acc.weather_road_conditions,
            injured_count=acc.injured_count,
            description=acc.description,
            employee_name=emp_name,
            participants=parts
        ))
    return res

# 10. Отчетность и Аналитика (UC-05)
@app.get("/api/reports/stolen", response_model=schemas.TheftStatsResponse, summary="Статистика розыска и угонов")
def get_reports_stolen(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(RoleChecker(["analyst", "admin"]))
):
    total_vehicles = db.query(Vehicle).count()
    total_stolen_active = db.query(Search).outerjoin(Found).filter(Found.id_search == None).count()
    
    active_searches = db.query(Search).outerjoin(Found).filter(Found.id_search == None).all()
    brand_counts = {}
    for s in active_searches:
        brand_name = s.vehicle.model.brand.name if (s.vehicle and s.vehicle.model and s.vehicle.model.brand) else "Другие"
        brand_counts[brand_name] = brand_counts.get(brand_name, 0) + 1
        
    by_brand = []
    for b, c in sorted(brand_counts.items(), key=lambda x: x[1], reverse=True):
        by_brand.append(schemas.TheftStatsBrandDetail(brand=b, count=c))
        
    return schemas.TheftStatsResponse(
        total_vehicles=total_vehicles,
        total_stolen_active=total_stolen_active,
        by_brand=by_brand
    )

# 11. Журнал аудита (UC-06)
@app.get("/api/admin/audit", response_model=List[schemas.AuditLogResponse], summary="Получить журнал аудита")
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(RoleChecker(["admin"]))
):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).all()
