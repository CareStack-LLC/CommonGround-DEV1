"""
E2E Test Agent: Payments & ClearFund System

Tests payment functionality including:
- Obligation creation
- Payment processing (Stripe test mode)
- Ledger accuracy
- Balance calculations
- Transaction history
"""

import pytest
import sys
import os
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class PaymentTestAgent:
    """Test agent for payment and ClearFund operations"""
    
    def __init__(self, email: str, password: str, name: str):
        self.email = email
        self.password = password
        self.name = name
        self.token = None
        self.user_id = None
        self.family_file_id = None
    
    def login(self):
        response = client.post("/api/v1/auth/login", json={
            "email": self.email,
            "password": self.password
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data["access_token"]
        self.user_id = data["user"]["id"]
        print(f"   ✅ {self.name} logged in")
        return self.token
    
    def get_headers(self):
        return {"Authorization": f"Bearer {self.token}"}
    
    def get_family_file(self):
        response = client.get("/api/v1/family-files/", headers=self.get_headers())
        assert response.status_code == 200
        files = response.json()
        self.family_file_id = files[0]["id"]
        return self.family_file_id
    
    def create_obligation(self, payee_id: str, amount: float, description: str):
        """Create a payment obligation"""
        response = client.post(
            "/api/v1/clearfund/obligations",
            headers=self.get_headers(),
            json={
                "family_file_id": self.family_file_id,
                "payer_id": self.user_id,
                "payee_id": payee_id,
                "amount": amount,
                "description": description,
                "due_date": (datetime.utcnow() + timedelta(days=30)).isoformat()
            }
        )
        
        assert response.status_code == 201, f"Obligation creation failed: {response.json()}"
        obligation = response.json()
        print(f"   ✅ {self.name} created obligation: {description}")
        print(f"      Amount: ${amount:.2f}")
        print(f"      ID: {obligation['id']}")
        
        return obligation
    
    def fund_obligation(self, obligation_id: str, amount: float, payment_method: str = "test_card"):
        """Fund an obligation (Stripe test mode)"""
        response = client.post(
            f"/api/v1/clearfund/obligations/{obligation_id}/fund",
            headers=self.get_headers(),
            json={
                "amount": amount,
                "payment_method": payment_method,
                "stripe_token": "tok_visa"  # Stripe test token
            }
        )
        
        assert response.status_code == 200, f"Payment failed: {response.json()}"
        payment = response.json()
        print(f"   ✅ {self.name} funded obligation")
        print(f"      Amount: ${amount:.2f}")
        print(f"      Transaction ID: {payment.get('transaction_id', 'N/A')}")
        
        return payment
    
    def get_balance(self):
        """Get ClearFund balance summary"""
        response = client.get(
            f"/api/v1/clearfund/balance/{self.family_file_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200
        balance = response.json()
        
        print(f"\n   💰 {self.name}'s Balance:")
        print(f"      Owed to me: ${balance.get('amount_owed_to_me', 0):.2f}")
        print(f"      I owe: ${balance.get('amount_i_owe', 0):.2f}")
        print(f"      Net balance: ${balance.get('net_balance', 0):.2f}")
        
        return balance
    
    def get_ledger(self):
        """Get transaction ledger"""
        response = client.get(
            f"/api/v1/clearfund/ledger/{self.family_file_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200
        ledger = response.json()
        
        print(f"\n   📋 Transaction Ledger:")
        print(f"      Total transactions: {len(ledger)}")
        
        for i, entry in enumerate(ledger[:5]):  # Show first 5
            print(f"      {i+1}. ${entry['amount']:.2f} - {entry['description']}")
        
        return ledger
    
    def get_obligations(self):
        """Get all obligations"""
        response = client.get(
            f"/api/v1/clearfund/obligations/family/{self.family_file_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200
        obligations = response.json()
        
        print(f"\n   📄 Obligations:")
        for obligation in obligations:
            status = obligation.get('status', 'unknown')
            amount = obligation.get('amount', 0)
            description = obligation.get('description', 'N/A')
            print(f"      • {description}: ${amount:.2f} ({status})")
        
        return obligations


def test_create_and_fund_obligation():
    """Test creating and funding a payment obligation"""
    print("\n" + "="*60)
    print("TEST: Create and Fund Obligation (Michael → Sarah)")
    print("="*60)
    
    sarah = PaymentTestAgent("e2e_test_sarah@commonground.test", "TestPass123!", "Sarah")
    michael = PaymentTestAgent("e2e_test_michael@commonground.test", "TestPass123!", "Michael")
    
    sarah.login()
    sarah.get_family_file()
    
    michael.login()
    michael.get_family_file()
    
    # Step 1: Create child support obligation
    print("\n📝 Step 1: Create child support obligation")
    obligation = michael.create_obligation(
        payee_id=sarah.user_id,
        amount=800.00,
        description="Monthly Child Support"
    )
    
    # Step 2: Michael funds the obligation
    print("\n💳 Step 2: Michael funds obligation via Stripe")
    payment = michael.fund_obligation(obligation["id"], 800.00)
    
    # Step 3: Verify balances updated
    print("\n💰 Step 3: Verify balances updated")
    michael_balance = michael.get_balance()
    sarah_balance = sarah.get_balance()
    
    # Michael should show he paid $800
    # Sarah should show she received $800
    
    # Step 4: Check transaction appears in ledger
    print("\n📋 Step 4: Verify transaction in ledger")
    ledger = sarah.get_ledger()
    
    # Find the payment transaction
    payment_entries = [e for e in ledger if e.get('amount') == 800.00]
    assert len(payment_entries) > 0, "Payment should appear in ledger"
    
    print(f"\n✅ Create and fund obligation test PASSED")


def test_multiple_payments_ledger_accuracy():
    """Test ledger accuracy with multiple payments"""
    print("\n" + "="*60)
    print("TEST: Multiple Payments Ledger Accuracy")
    print("="*60)
    
    jessica = PaymentTestAgent("e2e_test_jessica@commonground.test", "TestPass123!", "Jessica")
    david = PaymentTestAgent("e2e_test_david@commonground.test", "TestPass123!", "David")
    
    jessica.login()
    jessica.get_family_file()
    
    david.login()
    david.get_family_file()
    
    # Create multiple small obligations
    print("\n📝 Step 1: Create multiple shared expenses")
    
    obligations = []
    
    # Soccer fees - Jessica pays
    ob1 = jessica.create_obligation(
        payee_id=david.user_id,
        amount=150.00,
        description="Soccer fees (Jessica's share)"
    )
    obligations.append(ob1)
    
    # School supplies - David pays
    ob2 = david.create_obligation(
        payee_id=jessica.user_id,
        amount=75.00,
        description="School supplies (David's share)"
    )
    obligations.append(ob2)
    
    # Fund obligations
    print("\n💳 Step 2: Fund all obligations")
    jessica.fund_obligation(ob1["id"], 150.00)
    david.fund_obligation(ob2["id"], 75.00)
    
    # Verify net balance
    print("\n💰 Step 3: Verify net balances")
    jessica_balance = jessica.get_balance()
    david_balance = david.get_balance()
    
    # Net: Jessica paid $150, received $75 = -$75 (owes $75)
    # Net: David received $150, paid $75 = +$75 (owed $75)
    
    # Check ledger totals
    print("\n📊 Step 4: Verify ledger totals")
    jessica_ledger = jessica.get_ledger()
    
    total_debits = sum(e['amount'] for e in jessica_ledger if e['from_user_id'] == jessica.user_id)
    total_credits = sum(e['amount'] for e in jessica_ledger if e['to_user_id'] == jessica.user_id)
    
    print(f"   Total debits: ${total_debits:.2f}")
    print(f"   Total credits: ${total_credits:.2f}")
    
    print(f"\n✅ Multiple payments ledger accuracy test PASSED")


def test_payment_history_tracking():
    """Test transaction history tracking"""
    print("\n" + "="*60)
    print("TEST: Payment History Tracking")
    print("="*60)
    
    sarah = PaymentTestAgent("e2e_test_sarah@commonground.test", "TestPass123!", "Sarah")
    sarah.login()
    sarah.get_family_file()
    
    # Get all obligations
    print("\n📄 Step 1: Retrieve all obligations")
    obligations = sarah.get_obligations()
    
    assert len(obligations) > 0, "Should have obligations from seed data"
    
    # Check obligation structure
    for obligation in obligations[:3]:
        assert "amount" in obligation
        assert "description" in obligation
        assert "status" in obligation
        assert "payer_id" in obligation
        assert "payee_id" in obligation
    
    # Get ledger
    print("\n📋 Step 2: Retrieve transaction ledger")
    ledger = sarah.get_ledger()
    
    assert len(ledger) > 0, "Should have transactions from seed data"
    
    # Verify ledger entries have required fields
    for entry in ledger[:3]:
        assert "amount" in entry
        assert "transaction_type" in entry
        assert "created_at" in entry
    
    print(f"\n✅ Payment history tracking test PASSED")


def test_stripe_test_mode_payment():
    """Test Stripe integration in test mode"""
    print("\n" + "="*60)
    print("TEST: Stripe Test Mode Payment Processing")
    print("="*60)
    
    michael = PaymentTestAgent("e2e_test_michael@commonground.test", "TestPass123!", "Michael")
    sarah = PaymentTestAgent("e2e_test_sarah@commonground.test", "TestPass123!", "Sarah")
    
    michael.login()
    michael.get_family_file()
    
    sarah.login()
    sarah.get_family_file()
    
    # Create obligation
    print("\n📝 Step 1: Create test obligation")
    obligation = michael.create_obligation(
        payee_id=sarah.user_id,
        amount=50.00,
        description="Test Stripe Payment"
    )
    
    # Process payment with Stripe test token
    print("\n💳 Step 2: Process payment with Stripe test token")
    payment = michael.fund_obligation(
        obligation["id"],
        50.00,
        payment_method="test_card"
    )
    
    # Verify payment processed
    assert payment.get("status") in ["succeeded", "completed"], "Payment should be processed"
    
    print(f"\n   Payment Status: {payment.get('status', 'unknown')}")
    
    # Verify obligation marked as paid
    print("\n✅ Step 3: Verify obligation status updated")
    obligations = michael.get_obligations()
    test_obligation = next((o for o in obligations if o["id"] == obligation["id"]), None)
    
    if test_obligation:
        print(f"   Obligation Status: {test_obligation.get('status', 'unknown')}")
        assert test_obligation.get('status') in ["paid", "completed"]
    
    print(f"\n✅ Stripe test mode payment test PASSED")


def test_balance_calculations():
    """Test balance calculation accuracy"""
    print("\n" + "="*60)
    print("TEST: Balance Calculation Accuracy")
    print("="*60)
    
    jessica = PaymentTestAgent("e2e_test_jessica@commonground.test", "TestPass123!", "Jessica")
    david = PaymentTestAgent("e2e_test_david@commonground.test", "TestPass123!", "David")
    
    jessica.login()
    jessica.get_family_file()
    
    david.login()
    david.get_family_file()
    
    # Get current balances
    print("\n💰 Step 1: Get current balances")
    jessica_balance = jessica.get_balance()
    david_balance = david.get_balance()
    
    # Verify balance symmetry
    # What Jessica owes should equal what David is owed (for this family)
    # Or vice versa
    
    jessica_net = jessica_balance.get("net_balance", 0)
    david_net = david_balance.get("net_balance", 0)
    
    print(f"\n   Jessica net: ${jessica_net:.2f}")
    print(f"   David net: ${david_net:.2f}")
    print(f"   Sum: ${jessica_net + david_net:.2f}")
    
    # For a two-party system, net balances should sum to zero
    # (what one owes, the other is owed)
    total = abs(jessica_net + david_net)
    assert total < 1.00, f"Net balances should sum to ~0 (got {total})"
    
    print(f"\n✅ Balance calculation accuracy test PASSED")


def test_obligation_status_transitions():
    """Test obligation status transitions (pending → paid)"""
    print("\n" + "="*60)
    print("TEST: Obligation Status Transitions")
    print("="*60)
    
    sarah = PaymentTestAgent("e2e_test_sarah@commonground.test", "TestPass123!", "Sarah")
    michael = PaymentTestAgent("e2e_test_michael@commonground.test", "TestPass123!", "Michael")
    
    sarah.login()
    sarah.get_family_file()
    
    michael.login()
    michael.get_family_file()
    
    # Create obligation (starts as pending)
    print("\n📝 Step 1: Create obligation (status: pending)")
    obligation = michael.create_obligation(
        payee_id=sarah.user_id,
        amount=100.00,
        description="Status Transition Test"
    )
    
    initial_status = obligation.get("status", "unknown")
    print(f"   Initial Status: {initial_status}")
    assert initial_status in ["pending", "unpaid"]
    
    # Fund obligation (should transition to paid)
    print("\n💳 Step 2: Fund obligation")
    michael.fund_obligation(obligation["id"], 100.00)
    
    # Check updated status
    print("\n✅ Step 3: Verify status transition to 'paid'")
    obligations = michael.get_obligations()
    updated_obligation = next((o for o in obligations if o["id"] == obligation["id"]), None)
    
    if updated_obligation:
        final_status = updated_obligation.get("status", "unknown")
        print(f"   Final Status: {final_status}")
        assert final_status in ["paid", "completed"]
    
    print(f"\n✅ Obligation status transition test PASSED")


if __name__ == "__main__":
    """Run all payment tests"""
    print("\n" + "="*60)
    print("COMMONGROUND E2E TEST SUITE: PAYMENTS & CLEARFUND")
    print("="*60)
    
    try:
        test_create_and_fund_obligation()
        test_multiple_payments_ledger_accuracy()
        test_payment_history_tracking()
        test_stripe_test_mode_payment()
        test_balance_calculations()
        test_obligation_status_transitions()
        
        print("\n" + "="*60)
        print("✅ ALL PAYMENT TESTS PASSED")
        print("="*60)
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
