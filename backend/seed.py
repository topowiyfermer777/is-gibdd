from database import (
    engine, Base, SessionLocal, Manufacturer, Brand, Model, VehicleType, Color, 
    Employee, GRZ, SearchReason, AccidentType, AccidentReason, TOOrganization, 
    Counterparty, Vehicle, Registration, Search, Found, TO, Accident, AccidentParticipant
)
from auth import get_password_hash
import datetime
import os

def seed_db(force: bool = False):
    db_file = "gibdd.db"
    
    # Only remove existing database if force=True
    if force:
        if os.path.exists(db_file):
            try:
                os.remove(db_file)
                print("Removed existing database file to start fresh.")
            except Exception as e:
                print(f"Could not remove database file: {e}. Dropping all tables instead.")
                try:
                    Base.metadata.drop_all(bind=engine)
                    print("Dropped all tables successfully.")
                except Exception as ex:
                    print(f"Could not drop tables: {ex}")
            
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # If not forcing, check if there's already seeded data to avoid duplicate key errors
        if not force and db.query(Employee).first() is not None:
            print("Database already exists and has data. Skipping seeding.")
            return

        print("Seeding database...")
        
        # 1. Colors
        colors = [
            Color(name="Белый"),
            Color(name="Черный"),
            Color(name="Красный"),
            Color(name="Синий"),
            Color(name="Серебристый"),
            Color(name="Зеленый"),
            Color(name="Желтый")
        ]
        db.add_all(colors)
        db.commit()

        # 2. Vehicle Types
        types = [
            VehicleType(name="Легковой"),
            VehicleType(name="Грузовой"),
            VehicleType(name="Автобус"),
            VehicleType(name="Мотоцикл")
        ]
        db.add_all(types)
        db.commit()

        # 3. Manufacturers
        manufacturers = [
            Manufacturer(name="АВТОВАЗ"),
            Manufacturer(name="Toyota"),
            Manufacturer(name="BMW"),
            Manufacturer(name="Kia")
        ]
        db.add_all(manufacturers)
        db.commit()

        # 4. Brands
        brands = [
            Brand(name="Lada", id_manufacturer=manufacturers[0].id_manufacturer),
            Brand(name="Toyota", id_manufacturer=manufacturers[1].id_manufacturer),
            Brand(name="BMW", id_manufacturer=manufacturers[2].id_manufacturer),
            Brand(name="Kia", id_manufacturer=manufacturers[3].id_manufacturer)
        ]
        db.add_all(brands)
        db.commit()

        # 5. Models
        models = [
            Model(name="Vesta", id_brand=brands[0].id_brand, id_vehicle_type=types[0].id_vehicle_type, year_start=2015, year_end=2024),
            Model(name="Granta", id_brand=brands[0].id_brand, id_vehicle_type=types[0].id_vehicle_type, year_start=2011, year_end=2024),
            Model(name="Camry", id_brand=brands[1].id_brand, id_vehicle_type=types[0].id_vehicle_type, year_start=2017, year_end=2024),
            Model(name="Hilux", id_brand=brands[1].id_brand, id_vehicle_type=types[1].id_vehicle_type, year_start=2015, year_end=2024),
            Model(name="X5", id_brand=brands[2].id_brand, id_vehicle_type=types[0].id_vehicle_type, year_start=2018, year_end=2024),
            Model(name="Rio", id_brand=brands[3].id_brand, id_vehicle_type=types[0].id_vehicle_type, year_start=2011, year_end=2024)
        ]
        db.add_all(models)
        db.commit()

        # 6. Employees (hashed passwords)
        # табельный номер = id_employee
        employees = [
            Employee(id_employee=1001, last_name="Иванов", first_name="Иван", patronymic="Иванович", position="Системный администратор", role="admin", password_hash=get_password_hash("password")),
            Employee(id_employee=1002, last_name="Петров", first_name="Петр", patronymic="Сергеевич", position="Инспектор ДПС", role="inspector", password_hash=get_password_hash("password")),
            Employee(id_employee=1003, last_name="Сидоров", first_name="Сидор", patronymic="Петрович", position="Инспектор регистрационного отдела", role="registrar", password_hash=get_password_hash("password")),
            Employee(id_employee=1004, last_name="Козлов", first_name="Николай", patronymic="Васильевич", position="Сотрудник отдела техосмотра", role="to_employee", password_hash=get_password_hash("password")),
            Employee(id_employee=1005, last_name="Смирнов", first_name="Алексей", patronymic="Дмитриевич", position="Руководитель/Аналитик", role="analyst", password_hash=get_password_hash("password"))
        ]
        db.add_all(employees)
        db.commit()

        # 7. GRZ (License plates)
        plates = [
            # Free plates
            GRZ(series="А-АА", number="111", status="free"),
            GRZ(series="В-ВВ", number="222", status="free"),
            GRZ(series="Е-ЕЕ", number="333", status="free"),
            GRZ(series="К-КК", number="444", status="free"),
            GRZ(series="М-ММ", number="555", status="free"),
            # To be registered
            GRZ(series="О-ОО", number="777", status="issued"),
            GRZ(series="Х-ХХ", number="999", status="issued"),
            GRZ(series="У-УУ", number="888", status="issued")
        ]
        db.add_all(plates)
        db.commit()

        # 8. Search Reasons
        search_reasons = [
            SearchReason(name="Угон"),
            SearchReason(name="Скрытие с места ДТП"),
            SearchReason(name="Использование в преступных целях"),
            SearchReason(name="Иное")
        ]
        db.add_all(search_reasons)
        db.commit()

        # 9. Accident Types
        accident_types = [
            AccidentType(name="Столкновение"),
            AccidentType(name="Наезд на пешехода"),
            AccidentType(name="Опрокидывание"),
            AccidentType(name="Наезд на препятствие")
        ]
        db.add_all(accident_types)
        db.commit()

        # 10. Accident Reasons
        accident_reasons = [
            AccidentReason(name="Превышение скорости"),
            AccidentReason(name="Вождение в нетрезвом виде"),
            AccidentReason(name="Нарушение правил обгона"),
            AccidentReason(name="Неблагоприятные погодные условия")
        ]
        db.add_all(accident_reasons)
        db.commit()

        # 11. TO Organizations
        to_orgs = [
            TOOrganization(name="ООО Авто-Тест Центр", address="г. Москва, ул. Профсоюзная, д. 12", phone="+74951112233", email="info@autotest.ru"),
            TOOrganization(name="ИП Борисов Д.А. Диагностика", address="г. Москва, ул. Ленина, д. 45", phone="+74955556677", email="diagnost@mail.ru")
        ]
        db.add_all(to_orgs)
        db.commit()

        # 12. Counterparties (Owners)
        owners = [
            Counterparty(name="Иванов Петр Васильевич", address="г. Москва, ул. Мира, д. 5, кв. 10", phone="+79161234567", type="individual"),
            Counterparty(name="ООО Рога и Копыта", address="г. Москва, ул. Космонавтов, д. 8, оф. 4", phone="+74957778899", type="legal", inn="7708123456")
        ]
        db.add_all(owners)
        db.commit()

        # 13. Vehicles
        vehicles = [
            Vehicle(
                vin="Z7T12345678901234", body_number="BODY1111", engine_number="ENG2222", chassis_number="CHA3333",
                id_model=models[0].id_model, id_color=colors[1].id_color, year_produced=2020, engine_volume=1.6
            ),
            Vehicle(
                vin="Z7T98765432109876", body_number="BODY4444", engine_number="ENG5555", chassis_number="CHA6666",
                id_model=models[2].id_model, id_color=colors[0].id_color, year_produced=2019, engine_volume=2.5
            ),
            # Vehicle in search
            Vehicle(
                vin="STOLEN12345678901", body_number="STOLEN_BODY", engine_number="STOLEN_ENG", chassis_number="STOLEN_CHA",
                id_model=models[4].id_model, id_color=colors[2].id_color, year_produced=2021, engine_volume=3.0
            )
        ]
        db.add_all(vehicles)
        db.commit()

        # 14. Registrations
        registrations = [
            Registration(
                id_vehicle=vehicles[0].id_vehicle, id_counterparty=owners[0].id_counterparty,
                id_grz=plates[5].id_grz, id_employee=employees[2].id_employee, date_registered=datetime.date(2020, 5, 12)
            ),
            Registration(
                id_vehicle=vehicles[1].id_vehicle, id_counterparty=owners[1].id_counterparty,
                id_grz=plates[6].id_grz, id_employee=employees[2].id_employee, date_registered=datetime.date(2019, 11, 24)
            ),
            Registration(
                id_vehicle=vehicles[2].id_vehicle, id_counterparty=owners[0].id_counterparty,
                id_grz=plates[7].id_grz, id_employee=employees[2].id_employee, date_registered=datetime.date(2021, 8, 15)
            )
        ]
        db.add_all(registrations)
        db.commit()

        # 15. Searches (Stolen Registry)
        stolen_record = Search(
            id_vehicle=vehicles[2].id_vehicle, id_reason=search_reasons[0].id_reason,
            date_declared=datetime.datetime(2025, 10, 10, 14, 30), id_employee=employees[1].id_employee
        )
        db.add(stolen_record)
        db.commit()

        # 16. TO Records
        to_record = TO(
            id_vehicle=vehicles[0].id_vehicle, id_to_org=to_orgs[0].id_to_org,
            date_conducted=datetime.date(2024, 4, 1), date_next=datetime.date(2025, 4, 1)
        )
        db.add(to_record)
        db.commit()

        # 17. Accident sample
        accident = Accident(
            date_time=datetime.datetime(2024, 9, 15, 18, 45), location="г. Москва, Пересечение МКАД и Варшавского шоссе",
            id_accident_type=accident_types[0].id_accident_type, id_accident_reason=accident_reasons[0].id_accident_reason,
            weather_road_conditions="Дождь, мокрый асфальт", injured_count=2, description="Столкновение Lada Vesta и Toyota Camry",
            id_employee=employees[1].id_employee
        )
        db.add(accident)
        db.commit()

        # 18. Accident Participants
        parts = [
            AccidentParticipant(id_accident=accident.id_accident, id_vehicle=vehicles[0].id_vehicle, damage_amount=150000.0, damage_degree="Средняя"),
            AccidentParticipant(id_accident=accident.id_accident, id_vehicle=vehicles[1].id_vehicle, damage_amount=250000.0, damage_degree="Средняя")
        ]
        db.add_all(parts)
        db.commit()

        print("Database seeded successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == '__main__':
    # Force seed when run directly
    seed_db(force=True)
