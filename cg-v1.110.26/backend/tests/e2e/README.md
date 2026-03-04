# CommonGround E2E Testing Framework

> Comprehensive end-to-end testing suite for the CommonGround co-parenting platform

## 🎯 Overview

This E2E testing framework validates the entire CommonGround platform using realistic co-parent personas and automated test agents. It covers:

- **Backend API Testing**: Direct endpoint validation using Python test agents
- **Frontend Browser Testing**: User journey validation with browser automation
- **Realistic Scenarios**: High-conflict and low-conflict co-parent behaviors
- **Complete Coverage**: Messages, Events, Custody, Payments, Agreements

---

## 📁 Structure

```
backend/
├── scripts/
│   ├── seed_e2e_data.py          # Generate test data
│   └── run_e2e_tests.sh          # Run all tests
│
└── tests/e2e/
    ├── test_agent_messages.py     # Messages & ARIA
    ├── test_agent_events.py       # Events & Attendance
    ├── test_agent_custody.py      # Custody Tracking
    ├── test_agent_payments.py     # Payments & ClearFund
    └── test_agent_agreements.py   # Agreements
```

---

## 🚀 Quick Start

### 1. Setup Environment

Ensure backend is running:
```bash
# Terminal 1: Start backend
cd /Users/tj/Desktop/CommonGround/cg-v1.110.26/backend
python -m uvicorn app.main:app --reload
```

### 2. Seed Test Data

```bash
# Generate test data (4 parents, 2 families, sample data)
python scripts/seed_e2e_data.py --clean
```

**Output**: Creates 4 test user accounts with realistic data

### 3. Run All Tests

```bash
# Run complete test suite
bash scripts/run_e2e_tests.sh
```

**Expected Runtime**: ~2-3 minutes

---

## 👥 Test Personas

### Family 1: High-Conflict (Sarah & Michael)
- **Email**: e2e_test_sarah@commonground.test
- **Email**: e2e_test_michael@commonground.test
- **Password**: TestPass123!
- **Behavior**: Frequent ARIA interventions, missed events, compliance issues

### Family 2: Low-Conflict (Jessica & David)
- **Email**: e2e_test_jessica@commonground.test
- **Email**: e2e_test_david@commonground.test
- **Password**: TestPass123!
- **Behavior**: Professional communication, 100% event attendance, perfect compliance

---

## 🧪 Test Coverage

### ✅ Messages & ARIA (`test_agent_messages.py`)
- [x] High-conflict messaging with ARIA intervention
- [x] Low-conflict professional messaging
- [x] Toxicity level detection (none → severe)
- [x] Message rewrite suggestions
- [x] Severe toxicity blocking
- [x] Intervention logging

**Run individually**:
```bash
python tests/e2e/test_agent_messages.py
```

### ✅ Events & Attendance (`test_agent_events.py`)
- [x] Event creation (8 categories)
- [x] RSVP workflows
- [x] Missed event detection
- [x] GPS check-in validation
- [x] Attendance tracking
- [x] Event notifications

**Run individually**:
```bash
python tests/e2e/test_agent_events.py
```

### ✅ Custody Tracking (`test_agent_custody.py`)
- [x] QR code generation/scanning
- [x] GPS proximity validation
- [x] Manual custody overrides
- [x] Custody time calculations
- [x] Compliance metrics (7/30/90 day)
- [x] Exchange history tracking

**Run individually**:
```bash
python tests/e2e/test_agent_custody.py
```

### ✅ Payments & ClearFund (`test_agent_payments.py`)
- [x] Obligation creation
- [x] Payment processing (Stripe test mode)
- [x] Ledger accuracy
- [x] Balance calculations
- [x] Transaction history
- [x] Status transitions

**Run individually**:
```bash
python tests/e2e/test_agent_payments.py
```

### ✅ Agreements (`test_agent_agreements.py`)
- [x] Agreement creation (7 sections)
- [x] Section editing
- [x] ARIA template suggestions
- [x] Dual-parent approval workflow
- [x] Agreement activation
- [x] Approval timing comparison

**Run individually**:
```bash
python tests/e2e/test_agent_agreements.py
```

---

## 📊 Test Scenarios

### Scenario 1: High-Conflict Communication
**Personas**: Sarah → Michael  
**Flow**:
1. Sarah sends hostile message: "I can't believe you were late AGAIN..."
2. ARIA analyzes → flags as high toxicity
3. ARIA provides constructive rewrite
4. Sarah accepts rewrite
5. Michael receives professional message

**Success**: ✅ ARIA intervention logged, toxicity reduced

---

### Scenario 2: Missed Event Tracking
**Personas**: Sarah & Michael  
**Flow**:
1. Sarah creates soccer game event
2. Michael doesn't RSVP (typical 30% no-response rate)
3. Event time passes without check-in
4. System marks event as "missed"
5. Compliance score updated

**Success**: ✅ Missed event tracked, compliance metrics accurate

---

### Scenario 3: QR Code Exchange
**Personas**: Jessica & David  
**Flow**:
1. David generates QR code for exchange
2. Jessica scans QR within 15-minute window
3. GPS validates location within 0.5 miles
4. Custody transfers to Jessica
5. Exchange marked as compliant

**Success**: ✅ Custody state updates, compliance = 100%

---

### Scenario 4: Payment Processing
**Personas**: Michael → Sarah  
**Flow**:
1. Michael creates child support obligation ($800)
2. Michael funds via Stripe (test mode)
3. Payment recorded in ledger
4. Balances update for both parents
5. Transaction visible in history

**Success**: ✅ Payment processed, ledger balanced

---

### Scenario 5: Agreement Approval
**Personas**: Jessica & David  
**Flow**:
1. Jessica creates co-parenting agreement (7 sections)
2. Jessica fills sections with ARIA suggestions
3. Jessica submits for approval
4. David reviews and approves
5. Agreement activates with custody schedule

**Success**: ✅ Dual-approval enforced, agreement activated

---

## 🐛 Troubleshooting

### "No family files found"
**Solution**: Run seed script again
```bash
python scripts/seed_e2e_data.py --clean
```

### "ARIA analysis failed"
**Solution**: Check API keys in `.env`
```bash
# Verify these are set:
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

### "Connection refused"
**Solution**: Ensure backend is running
```bash
python -m uvicorn app.main:app --reload
```

### "Stripe payment failed"
**Solution**: Ensure using test mode keys
```bash
# In .env:
STRIPE_SECRET_KEY=sk_test_...  # Not sk_live_!
```

---

## 📈 Success Metrics

### Backend Tests
- **Target**: 95%+ pass rate
- **Performance**: API responses < 500ms
- **Coverage**: All critical endpoints tested

### Data Quality
- **ARIA**: All toxic messages flagged/rewritten
- **Custody**: Time calculations accurate
- **Payments**: Ledger balances to zero
- **Events**: All missed events tracked

---

## 🎥 Frontend Browser Testing

See browser automation workflows:
- `browser_test_message_flow.md` - Messaging with ARIA
- (Additional workflows in artifacts folder)

**Using Vercel Browser Agent**:
```javascript
// Example: Test login flow
await page.goto('https://commonground.vercel.app/login');
await page.fill('input[name="email"]', 'e2e_test_sarah@commonground.test');
await page.fill('input[name="password"]', 'TestPass123!');
await page.click('button[type="submit"]');
await page.screenshot({ path: 'sarah_login.png' });
```

---

## 📝 Adding New Tests

### 1. Create Test Agent Class

```python
class NewFeatureTestAgent:
    def __init__(self, email, password, name):
        # Standard init
        
    def login(self):
        # Standard login
        
    def test_new_feature(self):
        # Your test logic
```

### 2. Add Test Functions

```python
def test_my_new_feature():
    print("TEST: My New Feature")
    agent = NewFeatureTestAgent(...)
    agent.login()
    # Test assertions
```

### 3. Update Orchestration Script

Add to `run_e2e_tests.sh`:
```bash
run_test "My New Feature" "$TEST_DIR/test_agent_new_feature.py"
```

---

## 🔧 Configuration

### Test Database
Set in backend `.env`:
```bash
DATABASE_URL=postgresql://user:pass@localhost/commonground_test
```

### Stripe Test Mode
Use test keys (start with `sk_test_`):
```bash
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

### ARIA Configuration
Both Claude and GPT for redundancy:
```bash
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
```

---

## 📚 Documentation

- **Implementation Plan**: `/brain/.../implementation_plan.md`
- **Test Personas**: `/brain/.../personas.md`
- **Task Breakdown**: `/brain/.../task.md`
- **Testing Overview**: `/brain/.../e2e_testing_overview.md`

---

## ✅ Checklist for Running Tests

- [ ] Backend server running
- [ ] Database accessible
- [ ] API keys configured
- [ ] Test data seeded
- [ ] All test files executable
- [ ] Frontend deployed (for browser tests)

---

## 🎯 Next Steps

1. **Run tests**: `bash scripts/run_e2e_tests.sh`
2. **Review results**: Check terminal output for pass/fail
3. **Fix failures**: Debug any failed assertions
4. **Browser tests**: Use Vercel agent browser for frontend
5. **CI/CD**: Integrate into deployment pipeline

---

## 💡 Tips

- **Fresh data**: Always run with `--clean` flag for consistent results
- **Individual tests**: Run single test files for focused debugging
- **Screenshots**: Capture at critical steps for documentation
- **Parallel execution**: Tests are independent, can run in parallel
- **Persona consistency**: Agents maintain realistic behavioral patterns

---

**Questions?** See the detailed documentation in the `/brain/` artifacts folder.

**Ready to test!** 🚀
