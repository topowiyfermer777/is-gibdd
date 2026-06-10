from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime, Date, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
import datetime
import os

# Create database engine
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///gibdd.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 1. Производитель
class Manufacturer(Base):
    __tablename__ = "manufacturers"
    id_manufacturer = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False) # Название производителя
    
    brands = relationship("Brand", back_populates="manufacturer")

# 2. Марка
class Brand(Base):
    __tablename__ = "brands"
    id_brand = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False) # Название марки
    id_manufacturer = Column(Integer, ForeignKey("manufacturers.id_manufacturer"), nullable=False)
    
    manufacturer = relationship("Manufacturer", back_populates="brands")
    models = relationship("Model", back_populates="brand")

# 3. Модель
class Model(Base):
    __tablename__ = "models"
    id_model = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False) # Название модели
    id_brand = Column(Integer, ForeignKey("brands.id_brand"), nullable=False)
    id_vehicle_type = Column(Integer, ForeignKey("vehicle_types.id_vehicle_type"), nullable=False)
    year_start = Column(Integer) # Год начала выпуска
    year_end = Column(Integer) # Год окончания выпуска
    
    brand = relationship("Brand", back_populates="models")
    vehicle_type = relationship("VehicleType", back_populates="models")
    vehicles = relationship("Vehicle", back_populates="model")

# 4. Тип АТС
class VehicleType(Base):
    __tablename__ = "vehicle_types"
    id_vehicle_type = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False) # Название типа (легковой, грузовой и т.д.)
    
    models = relationship("Model", back_populates="vehicle_type")

# 5. Цвет
class Color(Base):
    __tablename__ = "colors"
    id_color = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False) # Название цвета
    
    vehicles = relationship("Vehicle", back_populates="color")

# 6. АТС
class Vehicle(Base):
    __tablename__ = "vehicles"
    id_vehicle = Column(Integer, primary_key=True, index=True)
    vin = Column(String, unique=True, nullable=False) # VIN номер
    body_number = Column(String) # Номер кузова
    engine_number = Column(String) # Номер двигателя
    chassis_number = Column(String) # Номер шасси
    id_model = Column(Integer, ForeignKey("models.id_model"), nullable=False)
    id_color = Column(Integer, ForeignKey("colors.id_color"), nullable=False)
    year_produced = Column(Integer, nullable=False) # Год выпуска
    engine_volume = Column(Float) # Объем двигателя
    
    model = relationship("Model", back_populates="vehicles")
    color = relationship("Color", back_populates="vehicles")
    to_records = relationship("TO", back_populates="vehicle")
    registrations = relationship("Registration", back_populates="vehicle")
    searches = relationship("Search", back_populates="vehicle")
    accident_parts = relationship("AccidentParticipant", back_populates="vehicle")

# 7. ОрганизацияТО
class TOOrganization(Base):
    __tablename__ = "to_organizations"
    id_to_org = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False) # Наименование
    address = Column(String) # Адрес
    phone = Column(String) # Телефон
    email = Column(String) # Email
    
    to_records = relationship("TO", back_populates="organization")

# 8. ТО
class TO(Base):
    __tablename__ = "to_records"
    id_to = Column(Integer, primary_key=True, index=True)
    id_vehicle = Column(Integer, ForeignKey("vehicles.id_vehicle"), nullable=False)
    id_to_org = Column(Integer, ForeignKey("to_organizations.id_to_org"), nullable=False)
    date_conducted = Column(Date, nullable=False) # Дата проведения
    date_next = Column(Date) # Дата следующего ТО
    
    vehicle = relationship("Vehicle", back_populates="to_records")
    organization = relationship("TOOrganization", back_populates="to_records")

# 9. ГРЗ
class GRZ(Base):
    __tablename__ = "grz"
    id_grz = Column(Integer, primary_key=True, index=True)
    series = Column(String, nullable=False) # Серия (например, А-АА)
    number = Column(String, nullable=False) # Номер (например, 123)
    status = Column(String, default="free") # free (свободен) / issued (выдан)
    
    registration = relationship("Registration", back_populates="grz", uselist=False)

# 10. Контрагент
class Counterparty(Base):
    __tablename__ = "counterparties"
    id_counterparty = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False) # Наименование / ФИО владельца
    address = Column(String, nullable=False) # Адрес
    phone = Column(String) # Телефон
    type = Column(String, nullable=False) # individual (физлицо) / legal (юрлицо)
    inn = Column(String) # ИНН (для юрлиц)
    
    registrations = relationship("Registration", back_populates="counterparty")

# 11. Регистрация АТС
class Registration(Base):
    __tablename__ = "registrations"
    id_registration = Column(Integer, primary_key=True, index=True)
    id_vehicle = Column(Integer, ForeignKey("vehicles.id_vehicle"), nullable=False)
    id_counterparty = Column(Integer, ForeignKey("counterparties.id_counterparty"), nullable=False)
    date_registered = Column(Date, default=datetime.date.today) # Дата регистрации
    id_grz = Column(Integer, ForeignKey("grz.id_grz"), nullable=False)
    id_employee = Column(Integer, ForeignKey("employees.id_employee"), nullable=False)
    
    vehicle = relationship("Vehicle", back_populates="registrations")
    counterparty = relationship("Counterparty", back_populates="registrations")
    grz = relationship("GRZ", back_populates="registration")
    employee = relationship("Employee", foreign_keys=[id_employee])
    deregistration = relationship("Deregistration", back_populates="registration", uselist=False)

# 12. Снятие АТС
class Deregistration(Base):
    __tablename__ = "deregistrations"
    id_registration = Column(Integer, ForeignKey("registrations.id_registration"), primary_key=True)
    date_deregistered = Column(Date, default=datetime.date.today) # Дата снятия
    id_employee = Column(Integer, ForeignKey("employees.id_employee"), nullable=False)
    
    registration = relationship("Registration", back_populates="deregistration")
    employee = relationship("Employee", foreign_keys=[id_employee])

# 13. Сотрудник ГИБДД
class Employee(Base):
    __tablename__ = "employees"
    id_employee = Column(Integer, primary_key=True, index=True)
    last_name = Column(String, nullable=False) # Фамилия
    first_name = Column(String, nullable=False) # Имя
    patronymic = Column(String) # Отчество
    position = Column(String, nullable=False) # Должность
    role = Column(String, nullable=False) # admin, inspector, registrar, to_employee, analyst
    password_hash = Column(String, nullable=False) # Хеш пароля (для авторизации)

# 14. Участник ДТП (Таблица связей многие-ко-многим с атрибутами)
class AccidentParticipant(Base):
    __tablename__ = "accident_participants"
    id_accident = Column(Integer, ForeignKey("accidents.id_accident"), primary_key=True)
    id_vehicle = Column(Integer, ForeignKey("vehicles.id_vehicle"), primary_key=True)
    damage_amount = Column(Float, default=0.0) # Сумма ущерба
    damage_degree = Column(String) # Степень повреждения (легкая, средняя, тотал)
    
    accident = relationship("Accident", back_populates="participants")
    vehicle = relationship("Vehicle", back_populates="accident_parts")

# 15. ДТП
class Accident(Base):
    __tablename__ = "accidents"
    id_accident = Column(Integer, primary_key=True, index=True)
    date_time = Column(DateTime, default=datetime.datetime.now) # Дата и время
    location = Column(String, nullable=False) # Место ДТП
    id_accident_type = Column(Integer, ForeignKey("accident_types.id_accident_type"), nullable=False)
    id_accident_reason = Column(Integer, ForeignKey("accident_reasons.id_accident_reason"), nullable=False)
    weather_road_conditions = Column(String) # Погодные и дорожные условия
    injured_count = Column(Integer, default=0) # Кол-во пострадавших
    description = Column(Text) # Краткое описание
    id_employee = Column(Integer, ForeignKey("employees.id_employee"), nullable=False) # Оформивший сотрудник
    
    accident_type = relationship("AccidentType", back_populates="accidents")
    accident_reason = relationship("AccidentReason", back_populates="accidents")
    employee = relationship("Employee", foreign_keys=[id_employee])
    participants = relationship("AccidentParticipant", back_populates="accident")

# 16. Тип ДТП
class AccidentType(Base):
    __tablename__ = "accident_types"
    id_accident_type = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False) # Название типа (столкновение, наезд и т.д.)
    
    accidents = relationship("Accident", back_populates="accident_type")

# 17. Причина ДТП
class AccidentReason(Base):
    __tablename__ = "accident_reasons"
    id_accident_reason = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False) # Название причины (превышение скорости и т.д.)
    
    accidents = relationship("Accident", back_populates="accident_reason")

# 18. Розыск
class Search(Base):
    __tablename__ = "searches"
    id_search = Column(Integer, primary_key=True, index=True)
    id_vehicle = Column(Integer, ForeignKey("vehicles.id_vehicle"), nullable=False)
    id_reason = Column(Integer, ForeignKey("search_reasons.id_reason"), nullable=False)
    date_declared = Column(DateTime, default=datetime.datetime.now) # Дата объявления
    id_employee = Column(Integer, ForeignKey("employees.id_employee"), nullable=False) # Инициировавший сотрудник
    
    vehicle = relationship("Vehicle", back_populates="searches")
    reason = relationship("SearchReason", back_populates="searches")
    employee = relationship("Employee", foreign_keys=[id_employee])
    found = relationship("Found", back_populates="search", uselist=False)

# 19. Причина (розыска)
class SearchReason(Base):
    __tablename__ = "search_reasons"
    id_reason = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False) # Название причины (угон, ДТП и т.д.)
    
    searches = relationship("Search", back_populates="reason")

# 20. Найденный
class Found(Base):
    __tablename__ = "founds"
    id_search = Column(Integer, ForeignKey("searches.id_search"), primary_key=True)
    date_found = Column(DateTime, default=datetime.datetime.now) # Дата
    
    search = relationship("Search", back_populates="found")

# 21. Лог аудита (Таблица для системного ведения истории действий)
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id_audit = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False) # ID Сотрудника
    role = Column(String, nullable=False) # Роль сотрудника
    action = Column(String, nullable=False) # Действие (LOGIN, SEARCH_VEHICLE, REGISTER_VEHICLE, STOLEN_VEHICLE, etc.)
    entity_type = Column(String) # Тип сущности (Vehicle, Registration, Search, etc.)
    entity_id = Column(Integer) # ID сущности
    details = Column(Text) # Дополнительные детали
    created_at = Column(DateTime, default=datetime.datetime.now) # Время действия

# Helper to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
