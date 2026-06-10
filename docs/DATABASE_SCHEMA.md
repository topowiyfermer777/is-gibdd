# Схема базы данных ИС ГИБДД

В качестве СУБД проекта используется **SQLite**. База данных состоит из 21 таблицы, обеспечивающих хранение справочников, характеристик АТС, сведений о владельцах, логах аудита, техосмотрах, ДТП и розыске.

---

## 1. ER-диаграмма связей таблиц (Текстовое описание)

* **Производство:** `manufacturers` (1) ---> (M) `brands` (1) ---> (M) `models` (1) ---> (M) `vehicles`
* **Характеристики АТС:** `vehicle_types` (1) ---> (M) `models` и `colors` (1) ---> (M) `vehicles`
* **Регистрация ТС:** 
  - `vehicles` (1) ---> (M) `registrations`
  - `counterparties` (1) ---> (M) `registrations` (Владельцы)
  - `grz` (1) ---> (1) `registrations` (Номерные знаки)
  - `employees` (1) ---> (M) `registrations` (Оформивший сотрудник)
  - `registrations` (1) ---> (0..1) `deregistrations` (Снятие с учета)
* **Технический осмотр (ТО):**
  - `vehicles` (1) ---> (M) `to_records`
  - `to_organizations` (1) ---> (M) `to_records`
* **Учет ДТП:**
  - `employees` (1) ---> (M) `accidents`
  - `accident_types` (1) ---> (M) `accidents`
  - `accident_reasons` (1) ---> (M) `accidents`
  - `accidents` (1) ---> (M) `accident_participants` (Участники ДТП)
  - `vehicles` (1) ---> (M) `accident_participants` (Связь многие-ко-многим с ущербом и повреждениями)
* **Реестр Розыска:**
  - `vehicles` (1) ---> (M) `searches`
  - `search_reasons` (1) ---> (M) `searches`
  - `employees` (1) ---> (M) `searches`
  - `searches` (1) ---> (0..1) `founds` (Отметка о нахождении ТС)
* **Системный журнал:** `audit_logs` (Автономная таблица)

---

## 2. Спецификация таблиц

### 1. `manufacturers` (Производители автомобилей)
- `id_manufacturer` (INTEGER, Primary Key): Идентификатор
- `name` (VARCHAR, Unique, Not Null): Наименование производителя (например, "Toyota", "Lada")

### 2. `brands` (Марки автомобилей)
- `id_brand` (INTEGER, Primary Key): Идентификатор
- `name` (VARCHAR, Not Null): Наименование марки (например, "Vesta", "Camry")
- `id_manufacturer` (INTEGER, Foreign Key -> `manufacturers`): Ссылка на производителя

### 3. `models` (Модели автомобилей)
- `id_model` (INTEGER, Primary Key): Идентификатор
- `name` (VARCHAR, Not Null): Название модели
- `id_brand` (INTEGER, Foreign Key -> `brands`): Ссылка на марку
- `id_vehicle_type` (INTEGER, Foreign Key -> `vehicle_types`): Ссылка на категорию/тип кузова
- `year_start` (INTEGER): Год начала выпуска модели
- `year_end` (INTEGER): Год окончания выпуска модели

### 4. `vehicle_types` (Категории и типы АТС)
- `id_vehicle_type` (INTEGER, Primary Key): Идентификатор
- `name` (VARCHAR, Unique, Not Null): Название категории (например, "Легковой", "Грузовой")

### 5. `colors` (Цвета кузова)
- `id_color` (INTEGER, Primary Key): Идентификатор
- `name` (VARCHAR, Unique, Not Null): Наименование цвета (например, "Белый", "Черный металлик")

### 6. `vehicles` (Автотранспортные средства - АТС)
- `id_vehicle` (INTEGER, Primary Key): Идентификатор
- `vin` (VARCHAR, Unique, Not Null): 17-значный VIN-код
- `body_number` (VARCHAR): Номер кузова
- `engine_number` (VARCHAR): Номер двигателя
- `chassis_number` (VARCHAR): Номер шасси
- `id_model` (INTEGER, Foreign Key -> `models`): Ссылка на модель
- `id_color` (INTEGER, Foreign Key -> `colors`): Ссылка на цвет
- `year_produced` (INTEGER, Not Null): Год выпуска
- `engine_volume` (FLOAT): Объем двигателя в литрах

### 7. `to_organizations` (Пункты и организации ТО)
- `id_to_org` (INTEGER, Primary Key): Идентификатор
- `name` (VARCHAR, Not Null): Наименование пункта ТО
- `address` (VARCHAR): Фактический адрес
- `phone` (VARCHAR): Контактный телефон
- `email` (VARCHAR): Электронная почта

### 8. `to_records` (Журнал прохождения техосмотров)
- `id_to` (INTEGER, Primary Key): Идентификатор
- `id_vehicle` (INTEGER, Foreign Key -> `vehicles`): Ссылка на автомобиль
- `id_to_org` (INTEGER, Foreign Key -> `to_organizations`): Пункт прохождения ТО
- `date_conducted` (DATE, Not Null): Дата проведения ТО
- `date_next` (DATE): Рекомендуемая следующая дата ТО

### 9. `grz` (Государственные регистрационные знаки)
- `id_grz` (INTEGER, Primary Key): Идентификатор
- `series` (VARCHAR, Not Null): Серия номерного знака (например, "А-АА 77")
- `number` (VARCHAR, Not Null): Номер (например, "123")
- `status` (VARCHAR): Текущий статус (`free` - свободен, `issued` - выдан)

### 10. `counterparties` (Владельцы транспортных средств)
- `id_counterparty` (INTEGER, Primary Key): Идентификатор
- `name` (VARCHAR, Not Null): ФИО физического лица или название компании
- `address` (VARCHAR, Not Null): Адрес регистрации
- `phone` (VARCHAR): Телефон
- `type` (VARCHAR, Not Null): Тип владельца (`individual` - физлицо, `legal` - юрлицо)
- `inn` (VARCHAR): ИНН юридического лица

### 11. `registrations` (Регистрации автомобилей)
- `id_registration` (INTEGER, Primary Key): Идентификатор
- `id_vehicle` (INTEGER, Foreign Key -> `vehicles`): Ссылка на ТС
- `id_counterparty` (INTEGER, Foreign Key -> `counterparties`): Ссылка на владельца
- `date_registered` (DATE): Дата выдачи свидетельства о регистрации
- `id_grz` (INTEGER, Foreign Key -> `grz`): Выданный ГРЗ
- `id_employee` (INTEGER, Foreign Key -> `employees`): Сотрудник регистрационного отдела

### 12. `deregistrations` (Архив снятия с учета)
- `id_registration` (INTEGER, Foreign Key -> `registrations`, Primary Key): Идентификатор регистрации
- `date_deregistered` (DATE): Дата аннулирования учета
- `id_employee` (INTEGER, Foreign Key -> `employees`): Сотрудник, снявший ТС с учета

### 13. `employees` (Сотрудники ГИБДД)
- `id_employee` (INTEGER, Primary Key): Табельный номер сотрудника
- `last_name` (VARCHAR, Not Null): Фамилия
- `first_name` (VARCHAR, Not Null): Имя
- `patronymic` (VARCHAR): Отчество
- `position` (VARCHAR, Not Null): Должность
- `role` (VARCHAR, Not Null): Роль доступа (`admin`, `inspector`, `registrar`, `to_employee`, `analyst`)
- `password_hash` (VARCHAR, Not Null): Хэшированный пароль доступа (Bcrypt)

### 14. `accident_participants` (Связующая таблица ДТП и АТС)
- `id_accident` (INTEGER, Foreign Key -> `accidents`, Primary Key): Ссылка на протокол ДТП
- `id_vehicle` (INTEGER, Foreign Key -> `vehicles`, Primary Key): Ссылка на автомобиль-участник
- `damage_amount` (FLOAT): Оценочная сумма ущерба в рублях
- `damage_degree` (VARCHAR): Степень повреждения кузова (`Легкая`, `Средняя`, `Тяжелая`, `Тотал`)

### 15. `accidents` (Протоколы ДТП)
- `id_accident` (INTEGER, Primary Key): Идентификатор протокола
- `date_time` (DATETIME): Дата и время аварии
- `location` (VARCHAR, Not Null): Адрес/место происшествия
- `id_accident_type` (INTEGER, Foreign Key -> `accident_types`): Категория аварии
- `id_accident_reason` (INTEGER, Foreign Key -> `accident_reasons`): Причина ДТП
- `weather_road_conditions` (VARCHAR): Погодные и дорожные условия
- `injured_count` (INTEGER): Количество пострадавших/погибших
- `description` (TEXT): Текстовые обстоятельства
- `id_employee` (INTEGER, Foreign Key -> `employees`): Оформивший инспектор

### 16. `accident_types` (Справочник видов ДТП)
- `id_accident_type` (INTEGER, Primary Key): Идентификатор
- `name` (VARCHAR, Unique, Not Null): Наименование (например, "Столкновение", "Опрокидывание")

### 17. `accident_reasons` (Справочник причин ДТП)
- `id_accident_reason` (INTEGER, Primary Key): Идентификатор
- `name` (VARCHAR, Unique, Not Null): Наименование (например, "Несоблюдение дистанции", "Гололед")

### 18. `searches` (Реестр объявлений в розыск)
- `id_search` (INTEGER, Primary Key): Идентификатор дела
- `id_vehicle` (INTEGER, Foreign Key -> `vehicles`): Ссылка на разыскиваемый автомобиль
- `id_reason` (INTEGER, Foreign Key -> `search_reasons`): Основание розыска
- `date_declared` (DATETIME): Дата и время подачи ориентировки
- `id_employee` (INTEGER, Foreign Key -> `employees`): Объявивший инспектор

### 19. `search_reasons` (Справочник причин розыска)
- `id_reason` (INTEGER, Primary Key): Идентификатор
- `name` (VARCHAR, Unique, Not Null): Название причины (например, "Угон", "Скрытие с места ДТП")

### 20. `founds` (Архив найденных ТС)
- `id_search` (INTEGER, Foreign Key -> `searches`, Primary Key): Идентификатор дела розыска
- `date_found` (DATETIME): Дата и время закрытия ориентировки / обнаружения ТС

### 21. `audit_logs` (Логи безопасности)
- `id_audit` (INTEGER, Primary Key): Идентификатор лога
- `user_id` (INTEGER, Not Null): Идентификатор сотрудника, совершившего действие
- `role` (VARCHAR, Not Null): Роль сотрудника
- `action` (VARCHAR, Not Null): Тип действия (например, `LOGIN`, `SEARCH_VEHICLE`, `REGISTER_VEHICLE`, `STOLEN_VEHICLE`)
- `entity_type` (VARCHAR): Тип затронутого класса/таблицы (например, `Vehicle`, `TO`, `Accident`)
- `entity_id` (INTEGER): Уникальный ID сущности
- `details` (TEXT): Текстовые подробности операции
- `created_at` (DATETIME): Дата и время действия
