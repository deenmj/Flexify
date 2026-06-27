# Testing Guide - Booking System Changes

## Quick Test Checklist

### Test 1: Regular User Booking Without Details
**Steps:**
1. Log in as a regular user (not admin)
2. Go to any vehicle detail page
3. Click "Book Now" button
4. User has NO phone/address/ID filled

**Expected:**
- ❌ "Book Now" button shows instead of "Verify and Book"
- ✅ Button text says "Verify and Book"
- ✅ Clicking redirects to `/verify?returnTo=/vehicles/{id}&pendingBooking=true`

**Pass/Fail:** ___________

---

### Test 2: Regular User Booking With Details
**Setup:**
- User previously filled: phone, address, ID number
- Driver license & selfie: NOT filled (optional)

**Steps:**
1. Log in as the user
2. Go to vehicle detail page
3. Click "Book Now"

**Expected:**
- ✅ Button text says "Book Now" (not "Verify and Book")
- ✅ Booking modal opens (calendar/date picker)
- ✅ Can select dates and submit booking
- ✅ No redirect to `/verify`

**Pass/Fail:** ___________

---

### Test 3: Admin/Subadmin Without Details
**Setup:**
- Log in as admin/subadmin user
- User has NO phone/address/ID in documents

**Steps:**
1. Navigate to vehicle detail page
2. Click "Book Now"

**Expected (CRITICAL - this was changed):**
- ✅ See "Verify and Book" button (NOT "Book Now")
- ✅ Redirected to `/verify` page
- ✅ Form is shown (NOT hidden)
- ✅ NO message saying "no need verification since you are admin"
- ✅ Can fill phone, address, ID just like regular user

**Pass/Fail:** ___________

**Note:** This is the key change - admin no longer bypasses verification!

---

### Test 4: Admin/Subadmin With Details
**Setup:**
- Admin user has phone, address, ID filled
- Optional fields (license/selfie) empty

**Steps:**
1. Log in as admin
2. Go to vehicle detail page
3. Click "Book Now"

**Expected:**
- ✅ Button text says "Book Now"
- ✅ Booking modal opens
- ✅ Can proceed with booking

**Pass/Fail:** ___________

---

### Test 5: Verification Form Validation
**Steps:**
1. Log in as any user without complete details
2. Go to `/verify` page
3. Try to submit form with missing fields

**Test 5a: Submit without Phone**
- Leave phone empty
- Fill address, ID, name
- Click submit button
**Expected:**
- ✅ Error message: "Please enter your phone number"
- ❌ Form NOT submitted

**Test 5b: Submit without Address**
- Fill phone, ID, name
- Leave address empty
- Click submit button
**Expected:**
- ✅ Error message: "Please enter your current address"
- ❌ Form NOT submitted

**Test 5c: Submit without ID**
- Fill phone, address, name
- Leave ID empty
- Click submit button
**Expected:**
- ✅ Error message: "Please enter your ID / License Number"
- ❌ Form NOT submitted

**Test 5d: Submit with all required (no optional)**
- Fill phone ✓, address ✓, ID ✓, name ✓
- Leave license & selfie empty (optional)
- Click submit button
**Expected:**
- ✅ Form submits successfully
- ✅ Redirect to dashboard or vehicle page
- ✅ verificationStatus = "pending"

**Pass/Fail:** ___________

---

### Test 6: Pending Booking Auto-Submit
**Steps:**
1. User without details clicks "Book Now" on a vehicle
2. Saves pending booking and redirects to `/verify`
3. User fills phone, address, ID (no photos)
4. Submits form

**Expected:**
- ✅ Message says "Verified & booking submitted successfully!"
- ✅ Auto-redirects to vehicle page
- ✅ Booking now shows in their bookings list
- ✅ Status = "PENDING" (waiting for owner approval)

**Pass/Fail:** ___________

---

### Test 7: KYC Modal Display - Images & Text
**Steps:**
1. Log in as admin/superadmin
2. Go to Admin Dashboard → Users tab
3. Find a user with complete KYC (license + selfie + all fields)
4. Click "View KYC Documents" button
5. Modal opens

**Expected Layout:**

**TOP SECTION (Images):**
- ✅ Two image boxes side by side
- ✅ Left: Driving License image (or "No document provided" if empty)
- ✅ Right: Profile Photo image (or "No document provided" if empty)

**BOTTOM SECTION (Text Details):**
- ✅ Light gray background box
- ✅ **ID / License Number** (bold label) + plain text value
- ✅ **Phone Number** (bold label) + plain text value  ← **NEW!**
- ✅ **Residential Address** (bold label) + plain text value
- ✅ **Verification Status** (bold label) + colored tag (green/orange)

**Visual Verification:**
- ❌ No "Not Provided" in boxes for text
- ✅ Phone number is visible (before it wasn't)
- ✅ Clear hierarchy (images first, then text)
- ✅ Easy to read who booked the vehicle

**Pass/Fail:** ___________

---

### Test 8: KYC Modal - Optional Fields Missing
**Steps:**
1. Find a user who submitted: phone ✓, address ✓, ID ✓
2. But NOT submitted: license, selfie
3. Click "View KYC"

**Expected:**
- ✅ Driving License box shows: "No document provided"
- ✅ Profile Photo box shows: "No document provided"
- ✅ Text details (phone, address, ID) still show clearly
- ✅ No error state, just friendly message

**Pass/Fail:** ___________

---

### Test 9: Vehicle Owner Experience
**Steps:**
1. Log in as vehicle owner
2. Check bookings for your vehicle
3. Click "View Renter Details" on a booking
4. Modal opens

**Expected:**
- ✅ See images of driver (if provided)
- ✅ Phone number visible (for calling renter)
- ✅ Address visible (for pickup coordination)
- ✅ ID visible (for verification)
- ✅ Easy to understand who is renting

**Pass/Fail:** ___________

---

### Test 10: Redirect Flow
**Setup:** User tries to book but missing details

**Steps:**
1. User clicks "Book Now"
2. Redirected to `/verify?returnTo=/vehicles/{vehicleId}&pendingBooking=true`
3. User fills all fields and submits
4. Form submits successfully

**Expected:**
- ✅ User auto-redirected back to `/vehicles/{vehicleId}`
- ✅ Vehicle page loads
- ✅ Pending booking was created
- ✅ "Continue Booking" button available if booking still pending

**Pass/Fail:** ___________

---

## Data Validation Checklist

### Phone Number
- [ ] Can contain spaces: "+94 77 123 4567" ✓
- [ ] Can contain dashes: "+94-77-123-4567" ✓
- [ ] Must not be empty when submitting form
- [ ] Trim whitespace before validation

### Address
- [ ] Can be multi-line or single line
- [ ] Must not be empty when submitting form
- [ ] Trim whitespace before validation
- [ ] Examples: "123 Main St", "Building A, Floor 3, Room 10"

### ID/NIC Number
- [ ] Can be alphanumeric
- [ ] Must not be empty when submitting form
- [ ] Examples: "123456789V", "987654321", "AB123456"

### License Image (Optional)
- [ ] Should accept .jpg, .png, .webp
- [ ] Should show preview before upload
- [ ] Can be removed/changed
- [ ] File compression working (show file size)

### Profile Photo (Optional)
- [ ] Should accept .jpg, .png, .webp
- [ ] Should show preview before upload
- [ ] Can be removed/changed
- [ ] File compression working

---

## Edge Cases to Test

### Edge Case 1: Whitespace-Only Fields
```
Phone: "    " (spaces only)
Address: "   " (spaces only)
ID: "   " (spaces only)
Expected: Validation fails (trim() removes whitespace)
```

### Edge Case 2: Empty Fields
```
Phone: ""
Address: "123 Main St"
ID: "ABC123"
Expected: "Please enter your phone number"
```

### Edge Case 3: Repeated Submissions
```
User fills form → Submit → Success
Same user tries to submit again
Expected: Status is "pending" → canSubmit = false → Form hidden with "Documents Under Review" banner
```

### Edge Case 4: Admin Trying to Bypass
```
Admin user tries to directly call booking API without submitting KYC
Expected: Backend still allows it (no backend check added)
But: Frontend prevents navigation to booking
Frontend redirects to /verify if documents missing
```

---

## Performance Checklist

- [ ] No additional API calls added
- [ ] Form submission completes in <2 seconds
- [ ] Modal opens without lag
- [ ] Images load quickly (already compressed)
- [ ] No console errors
- [ ] No TypeScript errors during build

---

## Rollback Plan (if needed)

If issues found during testing:

1. **Revert VehicleDetail.tsx** (remove phone check)
   - Keep `user.documents?.idNumber?.trim() && user.documents?.address?.trim()`

2. **Revert User.js** (keep old schema)
   - Remove phone field from documentsSchema

3. **Revert AdminDashboard.tsx** (restore old modal layout)
   - Go back to 3-column grid with ID in box

4. **Revert VerifyUser.tsx**
   - Add back admin bypass if needed

---

## Sign-Off Checklist

**Tested by:** ________________  
**Date:** ________________  
**Environment:** [ ] Dev [ ] Staging [ ] Production  

### All Tests Passed?
- [ ] Test 1: Regular user without details
- [ ] Test 2: Regular user with details  
- [ ] Test 3: Admin without details (key change)
- [ ] Test 4: Admin with details
- [ ] Test 5: Form validation
- [ ] Test 6: Auto-submit pending booking
- [ ] Test 7: KYC modal layout
- [ ] Test 8: Optional fields missing
- [ ] Test 9: Vehicle owner view
- [ ] Test 10: Redirect flow

**Ready for production?** [ ] YES [ ] NO

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________
