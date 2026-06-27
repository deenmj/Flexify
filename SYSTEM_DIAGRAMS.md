# System Diagrams - Booking Flow with Changes

## 1. Complete User Booking Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLEXIFY BOOKING SYSTEM                        │
│                   (UPDATED REQUIREMENTS)                         │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────┐
│  User Navigates to │
│  Vehicle Detail    │
└─────────┬──────────┘
          │
          ▼
    ┌─────────────────────────────────────┐
    │  Check: user.documents fields       │
    │  • idNumber ✓                       │
    │  • address ✓                        │
    │  • phone ✓  ← NEW REQUIREMENT      │
    │  (license & selfie OPTIONAL)        │
    └─────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
    ALL 3 FOUND        MISSING ANY
        │                   │
        ▼                   ▼
   ┌─────────────┐    ┌──────────────┐
   │ "Book Now"  │    │"Verify & Book"│
   │   Button    │    │    Button     │
   └─────┬───────┘    └────────┬──────┘
         │                     │
         ▼                     ▼
    BOOKING MODAL      /verify PAGE
    (Calendar)         │
         │             ├─ Phone field (mandatory)
         │             ├─ Address field (mandatory)
         │             ├─ ID field (mandatory)
         │             ├─ License photo (optional)
         │             ├─ Selfie photo (optional)
         │             └─ Submit button
         │                   │
         │                   ▼
         │            ┌──────────────────┐
         │            │ Validation Check │
         │            │ (all 3 mandatory)│
         │            └────────┬─────────┘
         │                     │
         │                     ▼
         │            ┌──────────────────┐
         │            │  Documents Saved │
         │            │ Status: "pending"│
         │            │ (No approval wait)
         │            └────────┬─────────┘
         │                     │
         └─────────┬───────────┘
                   │
                   ▼
         ┌──────────────────────┐
         │  CREATE BOOKING      │
         │  • Status: PENDING   │
         │  • Renter: User ID   │
         │  • Vehicle: ID       │
         │  • Dates: Range      │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Notify Owner         │
         │ (Email + Socket)     │
         └──────────┬───────────┘
                    │
                    ▼
    ┌──────────────────────────────────┐
    │ Owner Reviews Booking            │
    │ (In dashboard or email link)     │
    └──────┬───────────────────────────┘
           │
      ┌────┴────┐
      │          │
    ACCEPT     REJECT
      │          │
      ▼          ▼
   CONFIRMED  REJECTED
    (Can      (Notified)
    Pickup)
```

---

## 2. Admin/Subadmin Booking Flow (KEY CHANGE)

```
┌──────────────────────────────────────────────────────────┐
│  ADMIN/SUBADMIN BOOKING - UPDATED (NO BYPASS)            │
└──────────────────────────────────────────────────────────┘

Admin Visits Vehicle Page
         │
         ▼
    Check Documents
    ├─ idNumber?
    ├─ address?
    └─ phone?
         │
    ┌────┴─────┐
    │           │
   YES        NO
    │           │
    ▼           ▼
"Book Now"   "Verify & Book"
  │           │
  │           ▼
  │        /verify (ADMIN SEES FORM)
  │        │
  │        ├─ Phone field (REQUIRED)
  │        ├─ Address field (REQUIRED)
  │        ├─ ID field (REQUIRED)
  │        ├─ License (optional)
  │        ├─ Selfie (optional)
  │        └─ Submit
  │           │
  │           ▼
  │        Documents Saved
  │        (pending review)
  │
  └────┬─────┘
       │
       ▼
    BOOKING MODAL
       │
       ▼
    CREATE BOOKING
    (Same process as users)

KEY CHANGE:
✓ BEFORE: Admin could bypass verification
✗ AFTER: Admin MUST submit phone + address + ID
✓ NO special messages for admin
✓ Same form as regular users
```

---

## 3. Data Flow - What's Required vs Optional

```
┌──────────────────────────────────────────────┐
│  RENTER DETAILS - MANDATORY vs OPTIONAL      │
└──────────────────────────────────────────────┘

MANDATORY (Must fill before booking)
══════════════════════════════════════
    ┌─────────────────┐
    │  Phone Number   │
    │  +94 77 123 456 │
    │  ✓ Required     │
    │  ✓ Stored       │
    │  ✓ Shown to     │
    │    owner        │
    └─────────────────┘
    
    ┌─────────────────┐
    │  Address        │
    │  123/1 Main St  │
    │  ✓ Required     │
    │  ✓ Stored       │
    │  ✓ Shown to     │
    │    owner        │
    └─────────────────┘
    
    ┌─────────────────┐
    │  ID/NIC Number  │
    │  123456789V     │
    │  ✓ Required     │
    │  ✓ Stored       │
    │  ✓ Shown to     │
    │    owner        │
    └─────────────────┘

OPTIONAL (Nice to have)
═══════════════════════
    ┌─────────────────┐
    │  License Image  │
    │  [PHOTO]        │
    │  ✓ Optional     │
    │  ✓ Speeds up    │
    │    verification │
    └─────────────────┘
    
    ┌─────────────────┐
    │  Selfie Photo   │
    │  [PHOTO]        │
    │  ✓ Optional     │
    │  ✓ Helps verify │
    │    identity     │
    └─────────────────┘

GATE LOGIC:
  hasKycFields = phone ✓ && address ✓ && id ✓
  
  If TRUE → Can book
  If FALSE → Redirect to /verify
```

---

## 4. KYC Modal Display Structure

```
┌────────────────────────────────────────────────────────┐
│  KYC Documents: [Renter Name]                          │
├────────────────────────────────────────────────────────┤
│                                                        │
│  SECTION 1: IMAGES (in boxes)                          │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │ Driving License  │  │ Profile Photo    │           │
│  │                  │  │                  │           │
│  │  [IMAGE or       │  │  [IMAGE or       │           │
│  │   "No document   │  │   "No document   │           │
│  │   provided"]     │  │   provided"]     │           │
│  │                  │  │                  │           │
│  └──────────────────┘  └──────────────────┘           │
│                                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                        │
│  SECTION 2: DETAILS (text in gray box)                │
│  ┌──────────────────────────────────────────┐        │
│  │ ID / License Number                      │        │
│  │ 12345678                                 │        │
│  │                                          │        │
│  │ Phone Number                             │        │
│  │ +94 77 123 4567                         │        │
│  │                                          │        │
│  │ Residential Address                      │        │
│  │ 171/1 Main Street, Colombo 5            │        │
│  │                                          │        │
│  │ Verification Status                      │        │
│  │ [APPROVED] ← Green Tag                   │        │
│  └──────────────────────────────────────────┘        │
│                                                        │
│                    [Close]   [Delete KYC]            │
└────────────────────────────────────────────────────────┘

DESIGN PRINCIPLE:
  Images → Stay in boxes (visual content)
  Text → Move to organized gray box (data content)
  
BENEFITS FOR OWNER:
  ✓ Easy to see who booked (photos top)
  ✓ Can call renter (phone visible)
  ✓ Know pickup location (address clear)
  ✓ Verify identity (ID shown)
  ✓ Professional layout
```

---

## 5. Validation Flow

```
┌─────────────────────────────────────┐
│  USER SUBMITS VERIFICATION FORM      │
└────────────┬────────────────────────┘
             │
             ▼
    ┌────────────────────────┐
    │ Validation Checks:     │
    └────────────┬───────────┘
                 │
        ┌────────┼────────┐
        │        │        │
        ▼        ▼        ▼
    ┌────────┐  ┌────────┐  ┌────────┐
    │ Phone  │  │Address │  │   ID   │
    │ Valid? │  │Valid?  │  │Valid?  │
    └───┬────┘  └───┬────┘  └───┬────┘
        │           │            │
    ┌───┴───┐   ┌───┴───┐   ┌───┴───┐
    │ Y / N │   │ Y / N │   │ Y / N │
    └───────┘   └───────┘   └───────┘

    ALL 3 VALID?
        │
    ┌───┴───┐
    │       │
   YES     NO
    │       │
    ▼       ▼
 SUBMIT   ERROR
  ▼        │
 Save    Show
 docs    message
 │
 ▼
 Status:
 "pending"
 │
 ▼
 SUCCESS
 (can book
  immediately)


ERROR MESSAGES:
❌ No phone → "Please enter your phone number"
❌ No address → "Please enter your current address"
❌ No ID → "Please enter your ID / License Number"

FILE VALIDATION:
✓ License image → Compress & preview
✓ Selfie image → Compress & preview
(Both are OPTIONAL - no error if missing)
```

---

## 6. State Machine - User Document States

```
┌─────────────────────────────────────────────────────────┐
│            DOCUMENT SUBMISSION STATES                    │
└─────────────────────────────────────────────────────────┘

INITIAL STATE
    │
    ├─ verificationStatus = "not_submitted"
    ├─ isKycVerified = false
    ├─ documents = {}
    └─ Action: User redirected to /verify

           ↓

STATE 1: AFTER SUBMISSION
    │
    ├─ verificationStatus = "pending" ← USER CAN BOOK NOW
    ├─ isKycVerified = false
    ├─ documents = {
    │   phone: "+94...",
    │   address: "123 Main",
    │   idNumber: "ABC123",
    │   license: "file_path" (optional),
    │   selfie: "file_path" (optional)
    │ }
    └─ Action: User can book vehicles immediately

           ↓
           
ADMIN REVIEWS (async, no waiting)
    │
    ├─ verificationStatus = "approved" OR "rejected"
    │
    ▼ APPROVED BRANCH        ▼ REJECTED BRANCH
    │                        │
    ├─ isKycVerified = true  ├─ isKycVerified = false
    ├─ kycVerifiedAt = NOW   ├─ verificationStatus = "rejected"
    ├─ User: Full access     ├─ rejectionReason = "..."
    └─ Action: Done          ├─ User redirected to /verify
                             └─ Action: Resubmit docs


BOOKING ALLOWED IN STATES:
    ✓ "pending" (admin reviewing, but already can book)
    ✓ "approved" (admin approved)

BOOKING BLOCKED IN STATES:
    ✗ "not_submitted" (no documents)
    ✗ "rejected" (must resubmit)
```

---

## 7. Admin Dashboard User Check

```
┌─────────────────────────────────────────────────┐
│ ADMIN DASHBOARD - VIEWING USER KYC              │
└────────────────┬────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
   USERS TAB      BOOKINGS TAB
        │                 │
        ├─ Find user      └─ Find booking
        │                    │
        ▼                    ▼
   Click "View KYC"     Click user name
        │                    │
        ▼                    ▼
   Open KYC modal      User detail page
        │                    │
        ▼                    ▼
   Show documents      Click "View KYC"
   (with NEW layout)        │
                            ▼
                      KYC Modal Opens
                      (Same layout)


MODAL SHOWS:
   ┌─────────────────────────────┐
   │ Top: 2 Image Boxes          │
   │ • Driving License (optional)│
   │ • Profile Photo (optional)  │
   │                             │
   │ Bottom: Text Details Box    │
   │ • ID / License Number       │
   │ • Phone Number ← NEW        │
   │ • Address                   │
   │ • Status Tag                │
   └─────────────────────────────┘

ADMIN ACTIONS:
   ✓ View KYC documents
   ✓ Approve/Reject (subadmin view)
   ✓ See full renter info
   ✓ Contact via phone (now visible)
   ✓ Delete documents (superadmin only)
```

---

## 8. Summary: What Changed

```
BOOKING FLOW CHANGES
═══════════════════════════════════════════════════════════

REQUIREMENT 1: Mandatory Fields
  BEFORE: phone, address, ID were optional
  AFTER:  phone, address, ID are MANDATORY ✓
  IMPACT: Users can't book without all 3

REQUIREMENT 2: Optional Fields  
  BEFORE: license & photo optional
  AFTER:  license & photo still optional ✓
  IMPACT: No change (already working)

REQUIREMENT 3: Immediate Booking
  BEFORE: Need admin approval to book
  AFTER:  Book immediately after submitting ✓
  IMPACT: Users can book in "pending" state

REQUIREMENT 4: Admin Must Verify
  BEFORE: Admin bypass available
  AFTER:  Admin MUST submit like users ✓
  IMPACT: No special treatment for admin

REQUIREMENT 5: KYC Modal Display
  BEFORE: Mixed layout, "Not Provided" boxes
  AFTER:  Images in boxes, text in details ✓
  IMPACT: Better visual clarity

DATABASE CHANGES: None (backward compatible)
API CHANGES: None
NEW ENDPOINTS: None
```

---

## 9. Quick Reference - File Changes

```
4 FILES CHANGED
═══════════════════════════════════════════════════════════

1. backend/models/User.js
   Line 5-11: Add phone to documentsSchema
   Change: +1 line (add phone field)
   
2. flexify-app/src/pages/VehicleDetail.tsx
   Lines 285-289: Add phone to booking validation
   Lines 330-334: Add phone to button text logic
   Change: +10 lines (split validation for clarity)
   
3. flexify-app/src/pages/VerifyUser.tsx
   Line 332: Add clarifying comment
   Change: +1 line (documentation)
   
4. flexify-app/src/pages/AdminDashboard.tsx
   Lines 1252-1286: Restructure KYC modal layout
   Change: +19 lines (better organization)

TOTAL: ~50 lines added, ~20 removed, ~30 net change
```

---

## 10. Rollback Decision Tree

```
ISSUE FOUND?
    │
    ├─ Admin can bypass verification
    │  └─ Revert VehicleDetail.tsx (remove phone check)
    │
    ├─ Phone not saving
    │  └─ Check User.js documentsSchema
    │     └─ Verify phone field exists
    │
    ├─ Form validation broken
    │  └─ Check VerifyUser.tsx form handling
    │     └─ Verify phone/address/ID required
    │
    ├─ Modal display broken
    │  └─ Revert AdminDashboard.tsx
    │     └─ Go back to old layout
    │
    └─ No issues
       └─ ✓ PRODUCTION READY
```
