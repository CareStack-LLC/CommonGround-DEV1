#!/bin/bash
# Seed test data for Professional Portal via API
# Run: bash scripts/seed_via_api.sh

API_URL="http://localhost:8000/api/v1"

echo "=============================================="
echo "SEEDING PROFESSIONAL PORTAL TEST DATA"
echo "=============================================="

# Create temp directory for JSON files
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Helper function to register and get token
register_user() {
    local email=$1
    local password=$2
    local first_name=$3
    local last_name=$4

    cat > "$TMPDIR/user.json" << EOF
{"email":"$email","password":"$password","first_name":"$first_name","last_name":"$last_name"}
EOF

    response=$(curl -s -X POST "$API_URL/auth/register" \
        -H "Content-Type: application/json" \
        -d @"$TMPDIR/user.json")

    echo "$response" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('access_token', ''))" 2>/dev/null
}

# Helper function to login and get token
login_user() {
    local email=$1
    local password=$2

    cat > "$TMPDIR/login.json" << EOF
{"email":"$email","password":"$password"}
EOF

    response=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d @"$TMPDIR/login.json")

    echo "$response" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('access_token', ''))" 2>/dev/null
}

echo ""
echo "👨‍⚖️ Creating Professionals..."
echo "--------------------------------------------"

# Create professionals
JENNIFER_TOKEN=$(register_user "jennifer.lawson@familyfirst.com" "TestPass123" "Jennifer" "Lawson")
if [ -z "$JENNIFER_TOKEN" ]; then
    JENNIFER_TOKEN=$(login_user "jennifer.lawson@familyfirst.com" "TestPass123")
fi
echo "✓ Jennifer Lawson (Lead Attorney): jennifer.lawson@familyfirst.com"

DAVID_TOKEN=$(register_user "david.chen@familyfirst.com" "TestPass123" "David" "Chen")
if [ -z "$DAVID_TOKEN" ]; then
    DAVID_TOKEN=$(login_user "david.chen@familyfirst.com" "TestPass123")
fi
echo "✓ David Chen (Associate): david.chen@familyfirst.com"

AMY_TOKEN=$(register_user "amy.brooks@familyfirst.com" "TestPass123" "Amy" "Brooks")
if [ -z "$AMY_TOKEN" ]; then
    AMY_TOKEN=$(login_user "amy.brooks@familyfirst.com" "TestPass123")
fi
echo "✓ Amy Brooks (Paralegal): amy.brooks@familyfirst.com"

echo ""
echo "👨‍👩‍👧‍👦 Creating Family 1 (Johnson - High Conflict)..."
echo "--------------------------------------------"

# Create parents
MIKE_TOKEN=$(register_user "mike.johnson@test.com" "TestPass123" "Michael" "Johnson")
if [ -z "$MIKE_TOKEN" ]; then
    MIKE_TOKEN=$(login_user "mike.johnson@test.com" "TestPass123")
fi
echo "✓ Michael Johnson (Parent A): mike.johnson@test.com"

SARAH_TOKEN=$(register_user "sarah.johnson@test.com" "TestPass123" "Sarah" "Johnson")
if [ -z "$SARAH_TOKEN" ]; then
    SARAH_TOKEN=$(login_user "sarah.johnson@test.com" "TestPass123")
fi
echo "✓ Sarah Johnson (Parent B): sarah.johnson@test.com"

# Create family file
cat > "$TMPDIR/family1.json" << 'EOF'
{"title":"Johnson Family","state":"CA","county":"Los Angeles","parent_a_role":"father","parent_b_email":"sarah.johnson@test.com"}
EOF

FF1_RESPONSE=$(curl -s -X POST "$API_URL/family-files/" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MIKE_TOKEN" \
    -d @"$TMPDIR/family1.json")

FF1_ID=$(echo "$FF1_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('id', ''))" 2>/dev/null)
echo "✓ Created family file: $FF1_ID"

# Accept invitation as Parent B
if [ -n "$FF1_ID" ] && [ -n "$SARAH_TOKEN" ]; then
    curl -s -X POST "$API_URL/family-files/$FF1_ID/accept" \
        -H "Authorization: Bearer $SARAH_TOKEN" > /dev/null
    echo "✓ Sarah accepted invitation"
fi

# Add children
if [ -n "$FF1_ID" ]; then
    cat > "$TMPDIR/child1.json" << 'EOF'
{"first_name":"Emma","last_name":"Johnson","date_of_birth":"2018-03-15","gender":"female"}
EOF
    curl -s -X POST "$API_URL/family-files/$FF1_ID/children" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MIKE_TOKEN" \
        -d @"$TMPDIR/child1.json" > /dev/null
    echo "✓ Added Emma (age 7)"

    cat > "$TMPDIR/child2.json" << 'EOF'
{"first_name":"Liam","last_name":"Johnson","date_of_birth":"2020-07-22","gender":"male"}
EOF
    curl -s -X POST "$API_URL/family-files/$FF1_ID/children" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MIKE_TOKEN" \
        -d @"$TMPDIR/child2.json" > /dev/null
    echo "✓ Added Liam (age 5)"
fi

# Send messages (including some that trigger ARIA)
echo ""
echo "📧 Creating messages..."
if [ -n "$FF1_ID" ]; then
    # Message 1 - Normal
    cat > "$TMPDIR/msg1.json" << 'EOF'
{"content":"Can we discuss the pickup time for Saturday? I think 3pm works better for the kids."}
EOF
    curl -s -X POST "$API_URL/messages/" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MIKE_TOKEN" \
        -d "{\"family_file_id\":\"$FF1_ID\",\"content\":\"Can we discuss the pickup time for Saturday? I think 3pm works better for the kids.\"}" > /dev/null
    echo "✓ Normal message from Mike"

    # Message 2 - ARIA trigger (hostility)
    curl -s -X POST "$API_URL/messages/" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SARAH_TOKEN" \
        -d "{\"family_file_id\":\"$FF1_ID\",\"content\":\"You're ALWAYS changing plans at the last minute! You never think about anyone but yourself. This is exactly why the kids prefer being with me!\"}" > /dev/null
    echo "✓ ARIA-triggering message from Sarah (hostility + blame)"

    # Message 3 - Normal
    curl -s -X POST "$API_URL/messages/" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MIKE_TOKEN" \
        -d "{\"family_file_id\":\"$FF1_ID\",\"content\":\"Emma has a doctor's appointment on Tuesday at 3pm. I can take her if that works.\"}" > /dev/null
    echo "✓ Normal message from Mike"

    # Message 4 - ARIA trigger (controlling)
    curl -s -X POST "$API_URL/messages/" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SARAH_TOKEN" \
        -d "{\"family_file_id\":\"$FF1_ID\",\"content\":\"I don't care what you think. I'm keeping the kids this weekend whether you like it or not. You can't stop me.\"}" > /dev/null
    echo "✓ ARIA-triggering message from Sarah (controlling)"

    # Message 5 - ARIA trigger (passive aggressive)
    curl -s -X POST "$API_URL/messages/" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MIKE_TOKEN" \
        -d "{\"family_file_id\":\"$FF1_ID\",\"content\":\"Fine. Whatever. I guess some people just can't be bothered to follow agreements. Typical.\"}" > /dev/null
    echo "✓ ARIA-triggering message from Mike (passive aggressive)"

    # Message 6 - Normal
    curl -s -X POST "$API_URL/messages/" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SARAH_TOKEN" \
        -d "{\"family_file_id\":\"$FF1_ID\",\"content\":\"The school sent home a permission slip for the field trip next week. Should I sign it?\"}" > /dev/null
    echo "✓ Normal message from Sarah"
fi

echo ""
echo "👨‍👩‍👧 Creating Family 2 (Garcia - Medium Conflict)..."
echo "--------------------------------------------"

# Create parents
CARLOS_TOKEN=$(register_user "carlos.garcia@test.com" "TestPass123" "Carlos" "Garcia")
if [ -z "$CARLOS_TOKEN" ]; then
    CARLOS_TOKEN=$(login_user "carlos.garcia@test.com" "TestPass123")
fi
echo "✓ Carlos Garcia (Parent A): carlos.garcia@test.com"

MARIA_TOKEN=$(register_user "maria.garcia@test.com" "TestPass123" "Maria" "Garcia")
if [ -z "$MARIA_TOKEN" ]; then
    MARIA_TOKEN=$(login_user "maria.garcia@test.com" "TestPass123")
fi
echo "✓ Maria Garcia (Parent B): maria.garcia@test.com"

# Create family file
FF2_RESPONSE=$(curl -s -X POST "$API_URL/family-files/" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CARLOS_TOKEN" \
    -d '{"title":"Garcia Family","state":"CA","county":"San Diego","parent_a_role":"father","parent_b_email":"maria.garcia@test.com"}')

FF2_ID=$(echo "$FF2_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('id', ''))" 2>/dev/null)
echo "✓ Created family file: $FF2_ID"

# Accept invitation
if [ -n "$FF2_ID" ] && [ -n "$MARIA_TOKEN" ]; then
    curl -s -X POST "$API_URL/family-files/$FF2_ID/accept" \
        -H "Authorization: Bearer $MARIA_TOKEN" > /dev/null
    echo "✓ Maria accepted invitation"
fi

# Add child
if [ -n "$FF2_ID" ]; then
    curl -s -X POST "$API_URL/family-files/$FF2_ID/children" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $CARLOS_TOKEN" \
        -d '{"first_name":"Sofia","last_name":"Garcia","date_of_birth":"2016-11-08","gender":"female"}' > /dev/null
    echo "✓ Added Sofia (age 9)"
fi

# Add some normal messages
if [ -n "$FF2_ID" ]; then
    curl -s -X POST "$API_URL/messages/" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $CARLOS_TOKEN" \
        -d "{\"family_file_id\":\"$FF2_ID\",\"content\":\"Sofia's ballet recital is next Saturday at 2pm. Will you be able to make it?\"}" > /dev/null

    curl -s -X POST "$API_URL/messages/" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $MARIA_TOKEN" \
        -d "{\"family_file_id\":\"$FF2_ID\",\"content\":\"Yes, I'll be there! Should we sit together or separately?\"}" > /dev/null
    echo "✓ Added normal messages"
fi

echo ""
echo "🏢 Creating Professional Profiles and Firm..."
echo "--------------------------------------------"

# Create professional profile for Jennifer
if [ -n "$JENNIFER_TOKEN" ]; then
    PROF_RESPONSE=$(curl -s -X POST "$API_URL/professional/profile" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $JENNIFER_TOKEN" \
        -d '{"professional_type":"attorney","license_number":"CA-123456","license_state":"CA","practice_areas":["custody","divorce"]}')
    echo "✓ Created Jennifer's professional profile"

    # Create firm
    FIRM_RESPONSE=$(curl -s -X POST "$API_URL/professional/firms" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $JENNIFER_TOKEN" \
        -d '{"name":"Family First Law Group","slug":"family-first-law","firm_type":"law_firm","email":"contact@familyfirst.com","phone":"555-1000","city":"Los Angeles","state":"CA","is_public":true}')

    FIRM_ID=$(echo "$FIRM_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('id', ''))" 2>/dev/null)
    echo "✓ Created firm: Family First Law Group"
fi

# Create professional profiles for David and Amy
if [ -n "$DAVID_TOKEN" ]; then
    curl -s -X POST "$API_URL/professional/profile" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $DAVID_TOKEN" \
        -d '{"professional_type":"attorney","license_number":"CA-234567","license_state":"CA","practice_areas":["custody","mediation"]}' > /dev/null
    echo "✓ Created David's professional profile"
fi

if [ -n "$AMY_TOKEN" ]; then
    curl -s -X POST "$API_URL/professional/profile" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AMY_TOKEN" \
        -d '{"professional_type":"paralegal","practice_areas":["custody"]}' > /dev/null
    echo "✓ Created Amy's professional profile"
fi

echo ""
echo "=============================================="
echo "✅ SEED COMPLETE!"
echo "=============================================="
echo ""
echo "📋 TEST ACCOUNTS (Password: TestPass123)"
echo "--------------------------------------------"
echo ""
echo "🏢 PROFESSIONALS:"
echo "   • jennifer.lawson@familyfirst.com (Lead Attorney)"
echo "   • david.chen@familyfirst.com (Associate Attorney)"
echo "   • amy.brooks@familyfirst.com (Paralegal)"
echo ""
echo "👨‍👩‍👧‍👦 FAMILY 1 - Johnson (High Conflict):"
echo "   • mike.johnson@test.com (Parent A)"
echo "   • sarah.johnson@test.com (Parent B)"
echo "   • Family File ID: $FF1_ID"
echo "   • Children: Emma (7), Liam (5)"
echo "   • Has ARIA-flagged messages: Yes"
echo ""
echo "👨‍👩‍👧 FAMILY 2 - Garcia (Medium Conflict):"
echo "   • carlos.garcia@test.com (Parent A)"
echo "   • maria.garcia@test.com (Parent B)"
echo "   • Family File ID: $FF2_ID"
echo "   • Children: Sofia (9)"
echo ""
echo "🏢 LAW FIRM:"
echo "   • Name: Family First Law Group"
echo "   • Slug: family-first-law"
echo ""
echo "--------------------------------------------"
echo "Next steps:"
echo "1. Login as jennifer.lawson@familyfirst.com to see professional portal"
echo "2. Login as mike.johnson@test.com to see parent portal"
echo "3. Visit /find-professionals to browse firm directory"
echo "--------------------------------------------"
