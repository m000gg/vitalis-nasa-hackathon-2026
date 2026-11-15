# Vitalis Telemetry Simulator — Полный справочник команд

Документация по запуску Python-симулятора (`simulator/sim.py`) для всех 5 модулей рисков NASA HRP:
`radiation`, `isolation`, `distance`, `gravity`, `environment`.

---

## Быстрый старт и окружение

Все команды запускаются **из корня репозитория** (`vitalis-nasa-hackathon-2026/`).

### 1. Установка зависимостей

```bash
pip install -r simulator/requirements.txt
```

Пакеты: `supabase>=2.0.0`, `python-dotenv>=1.0.0`, `requests>=2.31.0`.

### 2. Переменные окружения

Скрипт автоматически читает `.env.local`, затем `.env` из корня репозитория:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (или `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### 3. База данных и реальные данные NASA

- Читает существующие сценарии и экипаж из таблиц `scenarios` и `characters` (обычно `mars-transit-126` и `chapea-surface-210`, по 5 слотов экипажа в каждом).
- Пишет и очищает **только** таблицы телеметрии: `character_hazard_data` и `character_hazard_samples`.
- Модуль `environment` использует реальный датасет [docs/nasa-data/RR-1_EDA_Telemetry_table.csv](../nasa-data/RR-1_EDA_Telemetry_table.csv) (`CO2_ppm_ISS * 0.00076` в `mmHg` и `Controller_Time_GMT`); при отсутствии файла переключается на встроенный fallback.

---

## Общий синтаксис

```bash
python3 simulator/sim.py --help
python3 simulator/sim.py <subcommand> [options]
```

Доступные подкоманды:
- `status` — диагностика БД и наличия датасета NASA
- `clear` — очистка телеметрии без удаления сценариев и экипажа
- `seed` — пакетная заливка истории (`character_hazard_samples`) и текущих показаний (`character_hazard_data`)
- `stream` — периодическая отправка живых тиков телеметрии в реальном времени

---

## 1. `status` — проверка состояния БД

Показывает список сценариев, количество членов экипажа, общее число строк в таблицах телеметрии, разбивку по каждому hazard и статус загрузки CSV.

```bash
python3 simulator/sim.py status
```

---

## 2. `seed` — заполнение БД сценариями

Генерирует данные сразу под все 5 hazard-модулей (`radiation`, `isolation`, `distance`, `gravity`, `environment`).
По умолчанию **сначала очищает** телеметрию в выбранной области (`--scenario` / `--hazard`), затем заливает свежую.

### Опции

| Флаг | Значения | По умолчанию | Описание |
| --- | --- | --- | --- |
| `--mode` | `positive`, `negative`, `demo` | `demo` | Профиль телеметрии |
| `--scenario` | ID сценария | все | Фильтр по сценарию (можно повторять флаг или перечислить через запятую) |
| `--hazard` | slug или `all` | все 5 | Фильтр по модулям (`radiation`, `isolation`, `distance`, `gravity`, `environment`) |
| `--no-reset` | флаг | выкл | Не удалять существующие строки перед заливкой |

### Режимы `--mode`

- **`positive`** — всё номинально (зелёный статус):
  - `radiation`: тихая солнечная обстановка, низкая доза, разброс по отсекам < 25%
  - `isolation`: нормальный сон и циркадная фаза, `missionDayPct` вне пика 50–75%, позитивный чек-ин
  - `distance`: минимальная задержка, активный контакт, мединвентарь в запасе
  - `gravity`: выполнены pre-test окна, стабильные икра/хват, выполнены 60м аэробных + 90м силовых тренировок
  - `environment`: `Demo Scenario = "none"`, `Simulated Minutes Elapsed = 20`, низкий CO₂ (`<= 2.85 mmHg`) и шум
- **`negative`** — критические сбои (красный/жёлтый статус):
  - `radiation`: активный шторм DONKI `SEP`, превышение порогов ALARA и разброс по отсекам
  - `isolation`: дефицит сна, `missionDayPct` в окне третьего квартала (50–75%), повышенный стресс/настроение
  - `distance`: solar conjunction (блэкаут связи), большая задержка, нехватка позиций мединвентаря
  - `gravity`: нарушения pre-test ограничений, падение объёма икры и силы хвата, недовполнение нагрузки
  - `environment`: `Demo Scenario = "co2-scrubber-failure"`, `120` мин, рост CO₂, падение O₂ в Lab, шум в Galley
- **`demo`** — реалистичный микс для презентации: часть экипажа в норме, у части пограничные/критические алерты.

### Примеры

```bash
# Залить всё зелёным
python3 simulator/sim.py seed --mode positive

# Залить сценарий аварий и сбоев
python3 simulator/sim.py seed --mode negative

# Залить смешанный демо-профиль (по умолчанию)
python3 simulator/sim.py seed --mode demo

# Точечно: только сценарий mars-transit-126 и только два модуля
python3 simulator/sim.py seed --mode negative --scenario mars-transit-126 --hazard gravity,environment

# Повторяемые флаги без предварительной очистки
python3 simulator/sim.py seed --mode positive --hazard radiation --hazard isolation --no-reset
```

---

## 3. `clear` — очистка телеметрии

Удаляет записи только из `character_hazard_samples` и `character_hazard_data`.
Таблицы `scenarios` и `characters` **не затрагиваются**.

### Опции

| Флаг | По умолчанию | Описание |
| --- | --- | --- |
| `--scenario` | все сценарии | Удалить телеметрию только указанных сценариев |
| `--hazard` | все hazard'ы | Удалить телеметрию только указанных модулей |

### Примеры

```bash
# Очистить всю телеметрию целиком
python3 simulator/sim.py clear

# Очистить только радиацию во всех сценариях
python3 simulator/sim.py clear --hazard radiation

# Очистить всё в конкретном сценарии
python3 simulator/sim.py clear --scenario chapea-surface-210
```

---

## 4. `stream` — живой поток телеметрии

Периодически отправляет свежие тики показаний и точки сэмплов. Удобно запускать на демо параллельно с открытым фронтом.

### Опции

| Флаг | Значения | По умолчанию | Описание |
| --- | --- | --- | --- |
| `--mode` | `positive`, `negative`, `demo` | `demo` | Профиль генерируемых тиков |
| `--interval` | число (сек) | `3.0` | Пауза между тиками |
| `--ticks` | целое число | `0` | Сколько тиков отправить (`0` — бесконечно до `Ctrl+C`) |
| `--via` | `db`, `api` | `db` | `db` — напрямую в Supabase; `api` — через HTTP-роуты Next.js (`/api/hazard-data`, `/api/hazard-samples`) |
| `--api-url` | URL | `http://localhost:3000` | Адрес Next.js сервера для `--via api` |
| `--scenario` | ID сценария | все | Фильтр по сценарию |
| `--hazard` | slug или `all` | все 5 | Фильтр по модулям |

### Примеры

```bash
# Бесконечный живой поток в БД каждые 3 секунды (остановка Ctrl+C)
python3 simulator/sim.py stream --mode negative --interval 3

# Ровно 5 тиков в позитивном режиме с интервалом 1 сек
python3 simulator/sim.py stream --mode positive --interval 1 --ticks 5

# Стриминг через локальный Next.js dev-сервер (должен быть запущен npm run dev)
python3 simulator/sim.py stream --mode negative --via api --api-url http://localhost:3000 --interval 3

# Стриминг только среды и изоляции для проверки Cross-Hazard алертов
python3 simulator/sim.py stream --mode negative --hazard environment,isolation --interval 2
```

---

## Готовый сценарий для демо / питча

1. Перед выходом на сцену проверить базу и выставить чистый старт:
   ```bash
   python3 simulator/sim.py status
   python3 simulator/sim.py seed --mode positive
   ```
2. Показать жюри зелёную матрицу экипажа и Privacy Firewall (разница между ролью `character` и `lead`).
3. Во время питча запустить поток инцидентов:
   ```bash
   python3 simulator/sim.py stream --mode negative --interval 3
   ```
4. После демо (при желании) вернуть смешанный `demo`-профиль:
   ```bash
   python3 simulator/sim.py seed --mode demo
   ```
