# System Verification Tests

**Purpose:** Comprehensive automated testing for the CommonGround platform
**Executed By:** Google Gemini 3 Pro QA Agent (Antigravity)
**Test Framework:** pytest + pytest-asyncio

---

## Directory Structure

```
system_verification/
├── README.md                          # This file
├── conftest.py                        # Pytest configuration & fixtures
├── test_health_checks.py             # System health verification
├── test_auth_flow.py                 # Authentication & authorization
├── test_case_management.py           # Case workflows
├── test_aria_messaging.py            # ARIA sentiment analysis
├── test_agreements.py                # Agreement builder
├── test_schedule.py                  # Schedule & compliance
└── fixtures/                          # Test data and utilities
    ├── sample_users.json
    ├── sample_cases.json
    └── sample_messages.json
```

---

## Test Categories

### 1. Health Checks (`test_health_checks.py`)
Verify system dependencies:
- Database connectivity (PostgreSQL)
- Cache connectivity (Redis)
- External APIs (Supabase, Anthropic, OpenAI)
- Application startup

**Run Frequency:** Every session start

### 2. Authentication Flow (`test_auth_flow.py`)
Test user authentication:
- User registration
- Login/logout
- Token refresh
- Protected routes
- Permission checks

**Coverage Target:** 95%+

### 3. Case Management (`test_case_management.py`)
Test case workflows:
- Case creation
- Invitation workflow
- Participant management
- Child CRUD operations
- Access control

**Coverage Target:** 90%+

### 4. ARIA Messaging (`test_aria_messaging.py`)
Test message system:
- Message sending/receiving
- Toxicity detection
- Sentiment analysis
- Message rewriting
- Good faith metrics

**Coverage Target:** 85%+

### 5. Agreements (`test_agreements.py`)
Test agreement system:
- Section creation/updates
- Dual approval workflow
- PDF generation (when implemented)
- Version history

**Coverage Target:** 80%+

### 6. Schedule (`test_schedule.py`)
Test scheduling:
- Event creation
- Recurrence rules
- Check-ins
- Compliance calculation

**Coverage Target:** 90%+

---

## Running Tests

### Run All Tests
```bash
cd mvp/backend
pytest tests/system_verification/ -v
```

### Run Specific Module
```bash
pytest tests/system_verification/test_auth_flow.py -v
```

### Run with Coverage
```bash
pytest tests/system_verification/ --cov=app --cov-report=html
```

### Run Health Checks Only
```bash
pytest tests/system_verification/test_health_checks.py -v
```

---

## Test Standards

### Test Naming Convention
```python
# Pattern: test_[feature]_[scenario]_[expected_outcome]

# Good examples
def test_user_registration_valid_email_creates_user():
    """Test that valid registration creates user successfully"""

def test_case_invitation_expired_token_returns_400():
    """Test that expired invitation token returns 400 error"""

def test_aria_high_toxicity_message_gets_flagged():
    """Test that highly toxic message triggers ARIA intervention"""
```

### Test Structure (AAA Pattern)
```python
async def test_feature_scenario_outcome():
    # ARRANGE - Set up test data
    user = await create_test_user(email="test@example.com")

    # ACT - Perform the action
    response = await client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "TestPass123!"
    })

    # ASSERT - Verify the outcome
    assert response.status_code == 200
    assert "access_token" in response.json()
```

### Retry Logic (3-Try Rule)
```python
@pytest.mark.retry(3)
async def test_flaky_external_api():
    """Test that may fail due to external factors"""
    # Will retry up to 3 times before marking as failed
    response = await external_api_call()
    assert response.status_code == 200
```

### Database Cleanup
```python
@pytest.fixture
async def test_db():
    """Provide clean test database for each test"""
    # Setup
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Teardown - ALWAYS cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()
```

---

## Fixtures

### Common Fixtures (`conftest.py`)

```python
@pytest.fixture
async def test_client():
    """Provide test HTTP client"""

@pytest.fixture
async def test_user():
    """Provide test user with valid credentials"""

@pytest.fixture
async def test_case():
    """Provide test case with two parents"""

@pytest.fixture
async def auth_headers():
    """Provide authentication headers for requests"""
```

---

## Reporting

### Test Results Format
Every test should log:
- Test name
- Duration
- Result (PASS/FAIL/SKIP)
- Error details (if failed)
- Attempt count (if retried)

### Failure Reporting
When test fails:
1. Log full error and stack trace
2. Create failure report in `docs/qa_reports/failures/`
3. Update `latest.json` with failure count
4. Include in session report

---

## Performance Testing

### Response Time Assertions
```python
async def test_api_performance():
    start = time.time()
    response = await client.get("/api/v1/cases/")
    duration = time.time() - start

    assert response.status_code == 200
    assert duration < 0.5, f"Response took {duration}s (limit: 0.5s)"
```

### Load Testing (Optional)
```python
@pytest.mark.slow
async def test_concurrent_requests():
    """Test system under concurrent load"""
    tasks = [client.get("/api/v1/cases/") for _ in range(100)]
    responses = await asyncio.gather(*tasks)

    assert all(r.status_code == 200 for r in responses)
```

---

## Test Data

### Sample Users (`fixtures/sample_users.json`)
```json
{
  "parent_a": {
    "email": "parent.a@test.com",
    "password": "TestPass123!",
    "first_name": "Alex",
    "last_name": "Smith"
  },
  "parent_b": {
    "email": "parent.b@test.com",
    "password": "TestPass123!",
    "first_name": "Bailey",
    "last_name": "Johnson"
  }
}
```

### Sample Cases (`fixtures/sample_cases.json`)
```json
{
  "active_case": {
    "case_name": "Smith v. Johnson",
    "state": "CA",
    "county": "Los Angeles",
    "children": [
      {
        "first_name": "Emma",
        "date_of_birth": "2015-06-15"
      }
    ]
  }
}
```

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: QA System Verification

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run System Tests
        run: |
          cd mvp/backend
          pytest tests/system_verification/ -v --junitxml=results.xml
      - name: Upload Results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: results.xml
```

---

## Debugging Failed Tests

### View Detailed Output
```bash
pytest tests/system_verification/test_auth_flow.py -vv -s
```

### Run Single Test
```bash
pytest tests/system_verification/test_auth_flow.py::test_user_login_valid_credentials -v
```

### Drop into Debugger on Failure
```bash
pytest tests/system_verification/ --pdb
```

---

## Coverage Goals

| Module | Current | Target |
|--------|---------|--------|
| Authentication | - | 95% |
| Case Management | - | 90% |
| ARIA Messaging | - | 85% |
| Agreements | - | 80% |
| Schedule | - | 90% |
| **Overall** | - | **87%** |

---

## Best Practices

### DO:
✅ Use descriptive test names
✅ Test one thing per test function
✅ Use fixtures for common setup
✅ Clean up resources after tests
✅ Assert specific values, not just truthiness
✅ Test both success and failure cases
✅ Use async/await correctly
✅ Mock external API calls when appropriate

### DON'T:
❌ Test implementation details
❌ Write tests that depend on execution order
❌ Use sleep() for timing - use proper async
❌ Commit test databases or credentials
❌ Skip cleanup logic
❌ Test multiple scenarios in one test
❌ Hardcode production values
❌ Ignore warnings

---

## Maintenance

### Weekly Tasks
- Review flaky tests (pass rate <100%)
- Update fixtures with new data patterns
- Archive old test logs
- Update coverage targets

### Monthly Tasks
- Performance baseline updates
- Test suite optimization
- Dependency updates
- Documentation review

---

**Created:** 2025-12-30
**Maintained By:** QA Automation System
**Questions?** See `docs/QA_AGENT_INSTRUCTIONS.md`
