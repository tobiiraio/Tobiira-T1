# Tobiira Database Schema

Complete schema documentation for all 7 MongoDB databases.

---

## Table of Contents

1. [Database Overview](#database-overview)
2. [Core Database (tobiira_core)](#core-database)
3. [Spatial Database (tobiira_spatial)](#spatial-database)
4. [Persta Database (tobiira_persta)](#persta-database)
5. [Testa Database (tobiira_testa)](#testa-database)
6. [Costa Database (tobiira_costa)](#costa-database)
7. [Bayra Database (tobiira_bayra)](#bayra-database)
8. [Lumi Database (tobiira_lumi)](#lumi-database)
9. [Cross-Database Relationships](#cross-database-relationships)
10. [Indexes Strategy](#indexes-strategy)

---

## Database Overview

### Seven Databases Approach

```
┌─────────────────┬──────────────────┬─────────────────┐
│ Database        │ Purpose          │ Size Estimate   │
├─────────────────┼──────────────────┼─────────────────┤
│ tobiira_core    │ Identity & Auth  │ Small (<1GB)    │
│ tobiira_spatial │ Shared Primitives│ Medium (<10GB)  │
│ tobiira_persta  │ Residential      │ Large (10-50GB) │
│ tobiira_testa   │ Hotels           │ Large (10-50GB) │
│ tobiira_costa   │ Commercial       │ Medium (<10GB)  │
│ tobiira_bayra   │ Car Wash         │ Small (<5GB)    │
│ tobiira_lumi    │ Restaurant       │ Small (<5GB)    │
└─────────────────┴──────────────────┴─────────────────┘
```

### Connection Configuration

```typescript
// Environment variables
MONGODB_CORE_URI=mongodb+srv://...
MONGODB_SPATIAL_URI=mongodb+srv://...
MONGODB_PERSTA_URI=mongodb+srv://...
MONGODB_TESTA_URI=mongodb+srv://...
MONGODB_COSTA_URI=mongodb+srv://...
MONGODB_BAYRA_URI=mongodb+srv://...
MONGODB_LUMI_URI=mongodb+srv://...

// Connection setup
const coreDB = mongoose.createConnection(process.env.MONGODB_CORE_URI, {
  dbName: 'tobiira_core'
});
// ... similar for other databases
```

---

## Core Database (tobiira_core)

**Purpose:** Platform identity, authentication, and organization management

### Collections

#### 1. core_users

**Purpose:** Platform users (login credentials, basic identity)

```typescript
{
  _id: ObjectId,
  email: string,                    // Unique, indexed
  phone?: string,                   // Optional, indexed if present
  
  // Authentication
  otpHash?: string,                 // Hashed OTP
  otpExpiresAt?: Date,              // OTP expiry
  otpAttempts?: number,             // Failed verification attempts
  
  // Profile
  firstName?: string,
  lastName?: string,
  avatar?: string,
  
  // Status
  isActive: boolean,                // Default: true
  isVerified: boolean,              // Email/phone verified
  
  // Security
  lastLoginAt?: Date,
  loginAttempts?: number,
  lockedUntil?: Date,
  
  // Metadata
  metadata?: object,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
{ email: 1 } // unique
{ phone: 1 } // sparse, unique
{ isActive: 1, isVerified: 1 }
{ createdAt: -1 }
```

#### 2. core_organizations

**Purpose:** Organizations (companies, properties, hotels)

```typescript
{
  _id: ObjectId,
  name: string,                     // Organization name
  slug: string,                     // URL-friendly, unique
  
  // Type
  type: string,                     // 'property_management' | 'hotel' | 'car_wash' | 'restaurant'
  
  // Contact
  email: string,
  phone?: string,
  website?: string,
  
  // Address
  address?: {
    street: string,
    city: string,
    state?: string,
    country: string,
    postalCode?: string
  },
  
  // Settings
  settings?: {
    timezone: string,               // Default: 'Africa/Kampala'
    currency: string,               // Default: 'UGX'
    language: string,               // Default: 'en'
  },
  
  // Subscription
  subscriptionTier?: string,        // 'free' | 'basic' | 'pro' | 'enterprise'
  subscriptionStatus?: string,      // 'active' | 'cancelled' | 'past_due'
  
  // Status
  isActive: boolean,
  
  // Metadata
  metadata?: object,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
{ slug: 1 } // unique
{ type: 1 }
{ isActive: 1 }
{ createdAt: -1 }
```

#### 3. core_memberships

**Purpose:** User-Organization relationships (who belongs to which org)

```typescript
{
  _id: ObjectId,
  userId: ObjectId,                 // Ref: core_users
  organizationId: ObjectId,         // Ref: core_organizations
  
  // Role
  role: string,                     // 'owner' | 'admin' | 'manager' | 'staff' | 'member'
  
  // Permissions
  permissions?: string[],           // Custom permissions
  
  // Status
  status: string,                   // 'pending' | 'active' | 'suspended' | 'removed'
  
  // Invitation
  invitedBy?: ObjectId,             // Who invited this user
  invitedAt?: Date,
  acceptedAt?: Date,
  
  // Context
  isDefault?: boolean,              // Default org for this user
  lastAccessedAt?: Date,
  
  // Metadata
  metadata?: object,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
{ userId: 1, organizationId: 1 } // unique compound
{ organizationId: 1, status: 1 }
{ userId: 1, isDefault: 1 }
{ status: 1, createdAt: -1 }
```

#### 4. core_roles

**Purpose:** Role definitions and permissions

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,         // Org-specific roles
  
  name: string,                     // Role name
  slug: string,                     // URL-friendly
  description?: string,
  
  // Permissions
  permissions: string[],            // Array of permission strings
  
  // Hierarchy
  level: number,                    // 1 = highest, 10 = lowest
  
  // Status
  isActive: boolean,
  isSystem: boolean,                // Cannot be deleted
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
{ organizationId: 1, slug: 1 } // unique compound
{ organizationId: 1, isActive: 1 }
```

---

## Spatial Database (tobiira_spatial)

**Purpose:** Shared platform primitives used by all verticals

### Collections

#### 1. spatial_spaces

**Purpose:** All space types (properties, units, rooms, bays, tables)

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,         // Who owns this space
  
  // Type discrimination
  spaceType: string,                // 'property' | 'block' | 'unit' | 'room' | 'bay' | 'table' | 'zone' | 'facility'
  
  // Basic info
  name: string,
  code?: string,                    // Human-readable (e.g., "3B", "204")
  
  // Geospatial
  location?: {
    type: 'Point',
    coordinates: [number, number]   // [longitude, latitude]
  },
  address?: {
    street: string,
    city: string,
    state?: string,
    country: string,
    postalCode?: string
  },
  
  // Hierarchy
  parentSpaceId?: ObjectId,         // Parent space (e.g., unit's parent is block)
  
  // Status
  status: string,                   // 'active' | 'inactive' | 'maintenance' | 'closed'
  
  // Type-specific fields (discriminator pattern)
  // For Property:
  propertyType?: string,            // 'residential' | 'hotel' | 'commercial' | 'car_wash' | 'restaurant'
  totalFloors?: number,
  totalUnits?: number,
  yearBuilt?: number,
  totalArea?: number,
  amenities?: string[],
  
  // For Unit/Room:
  unitNumber?: string,
  roomNumber?: string,
  bedrooms?: number,
  bathrooms?: number,
  area?: number,
  baseRent?: number,
  baseRate?: number,
  currency?: string,
  
  // For Room (hotel):
  roomType?: string,                // 'standard' | 'deluxe' | 'suite'
  maxOccupancy?: number,
  bedType?: string,
  bedCount?: number,
  
  // For Bay (car wash):
  bayType?: string,
  serviceCapability?: string[],
  
  // For Table (restaurant):
  seatingCapacity?: number,
  tableShape?: string,
  zoneId?: ObjectId,
  
  // Metadata
  metadata?: object,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
{ organizationId: 1, spaceType: 1 }
{ location: '2dsphere' }            // Geospatial queries
{ parentSpaceId: 1, spaceType: 1 }
{ organizationId: 1, status: 1 }
{ code: 1, organizationId: 1 }
```

#### 2. spatial_occupancies

**Purpose:** All occupancy types (leases, reservations, sessions)

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,
  
  // Type discrimination
  occupancyType: string,            // 'lease' | 'reservation' | 'wash_session' | 'dining_session'
  
  // Space reference
  spaceId: ObjectId,                // Ref: spatial_spaces
  spaceType: string,                // For faster queries
  
  // Actor reference
  actorId: ObjectId,                // Can reference different collections
  actorType: string,                // 'tenant' | 'guest' | 'customer'
  
  // Time (scheduled)
  scheduledStart: Date,             // When it should start
  scheduledEnd: Date,               // When it should end
  
  // Time (actual)
  actualStart?: Date,               // When it actually started
  actualEnd?: Date,                 // When it actually ended
  
  // Status
  status: string,                   // 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
  
  // Type-specific fields
  // For Lease:
  leaseType?: string,               // 'residential' | 'commercial'
  monthlyRent?: number,
  securityDeposit?: number,
  durationMonths?: number,
  applicationSubmittedAt?: Date,
  approvedAt?: Date,
  signedAt?: Date,
  moveInAt?: Date,
  terminatedAt?: Date,
  
  // For Reservation (hotel):
  numberOfGuests?: number,
  ratePerNight?: number,
  totalNights?: number,
  totalAmount?: number,
  currency?: string,
  bookedAt?: Date,
  confirmedAt?: Date,
  checkedInAt?: Date,
  checkedOutAt?: Date,
  cancelledAt?: Date,
  specialRequests?: string,
  bookingChannel?: string,
  
  // For Wash Session:
  vehicleId?: ObjectId,
  serviceType?: string,
  serviceDuration?: number,
  
  // For Dining Session:
  partySize?: number,
  tableAssignedAt?: Date,
  orderPlacedAt?: Date,
  
  // Metadata
  metadata?: object,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
{ organizationId: 1, occupancyType: 1 }
{ spaceId: 1, scheduledStart: 1, scheduledEnd: 1 }  // Availability queries
{ organizationId: 1, status: 1, scheduledEnd: 1 }   // Active occupancies
{ actorId: 1, status: 1 }
{ status: 1, scheduledStart: 1 }
```

#### 3. spatial_actors

**Purpose:** Lightweight actor primitive (base only)

```typescript
{
  _id: ObjectId,
  userId: ObjectId,                 // Ref: core_users
  organizationId: ObjectId,
  
  actorType: string,                // 'tenant' | 'guest' | 'customer' | 'staff'
  
  isActive: boolean,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
{ userId: 1, organizationId: 1 }
{ organizationId: 1, actorType: 1 }
```

#### 4. spatial_activities

**Purpose:** Shared activity types (payments, maintenance, service requests)

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,
  
  activityType: string,             // 'payment' | 'maintenance' | 'service_request'
  
  // References
  occupancyId?: ObjectId,           // Related occupancy
  spaceId?: ObjectId,               // Related space
  actorId: ObjectId,                // Who performed/requested
  
  // Status
  status: string,                   // Activity-specific statuses
  
  // Type-specific fields
  // For Payment:
  amount?: number,
  currency?: string,
  dueAt?: Date,
  paidAt?: Date,
  paymentMethod?: string,
  paymentType?: string,             // 'rent' | 'booking' | 'service'
  
  // For Maintenance:
  issueDescription?: string,
  priority?: string,
  reportedAt?: Date,
  assignedAt?: Date,
  assignedTo?: ObjectId,
  startedAt?: Date,
  completedAt?: Date,
  
  // For Service Request:
  requestType?: string,
  requestDescription?: string,
  requestedAt?: Date,
  fulfilledAt?: Date,
  
  // Metadata
  metadata?: object,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
{ organizationId: 1, activityType: 1 }
{ occupancyId: 1, activityType: 1 }
{ actorId: 1, status: 1 }
{ status: 1, dueAt: 1 }             // For payments
{ status: 1, priority: 1 }          // For maintenance
```

#### 5. spatial_events

**Purpose:** Temporal event log (all events across all verticals)

```typescript
{
  _id: ObjectId,
  
  // The 5 primitives
  organizationId: ObjectId,
  spaceId: ObjectId,
  occupancyId?: ObjectId,
  actorId: ObjectId,
  activityType: string,             // Event type (past tense)
  
  // When it happened
  occurredAt: Date,
  
  // Context
  spaceType?: string,
  actorType?: string,
  
  // Metadata
  metadata?: object,
  
  // Source vertical
  source?: string,                  // 'persta' | 'testa' | 'costa' | 'bayra' | 'lumi'
  
  // Timestamp (created only, no updates)
  createdAt: Date
}
```

**Indexes:**
```javascript
{ organizationId: 1, occurredAt: -1 }
{ spaceId: 1, occurredAt: -1 }
{ actorId: 1, occurredAt: -1 }
{ activityType: 1, occurredAt: -1 }
{ occurredAt: -1 }                  // Time-series queries
{ source: 1, occurredAt: -1 }
```

---

## Persta Database (tobiira_persta)

**Purpose:** Residential property management domain data

### Collections

#### 1. persta_tenants

**Purpose:** Residential tenant details

```typescript
{
  _id: ObjectId,
  actorId: ObjectId,                // Ref: spatial_actors
  organizationId: ObjectId,
  
  // Personal info
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  dateOfBirth?: Date,
  
  // Identification
  idType?: string,                  // 'national_id' | 'passport' | 'drivers_license'
  idNumber?: string,
  
  // Employment
  employmentStatus?: string,        // 'employed' | 'self_employed' | 'student' | 'unemployed'
  employer?: string,
  occupation?: string,
  monthlyIncome?: number,
  
  // Financial
  creditScore?: number,
  bankName?: string,
  accountNumber?: string,
  
  // Screening
  references?: [{
    name: string,
    phone: string,
    email?: string,
    relationship: string
  }],
  
  // Emergency contact
  emergencyContact?: {
    name: string,
    phone: string,
    relationship: string
  },
  
  // Documents
  documents?: [{
    type: string,
    url: string,
    uploadedAt: Date
  }],
  
  // Status
  screeningStatus?: string,         // 'pending' | 'approved' | 'rejected'
  isActive: boolean,
  
  // Metadata
  metadata?: object,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
{ actorId: 1 } // unique
{ organizationId: 1, isActive: 1 }
{ email: 1, organizationId: 1 }
{ screeningStatus: 1 }
```

#### 2. persta_lease_documents

**Purpose:** Lease agreement documents

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,
  leaseId: ObjectId,                // Ref: spatial_occupancies
  
  documentType: string,             // 'lease_agreement' | 'addendum' | 'termination'
  
  // Document
  url: string,
  filename: string,
  size: number,
  mimeType: string,
  
  // Signatures
  signatures?: [{
    signedBy: ObjectId,
    signedAt: Date,
    ipAddress?: string,
    signature?: string              // Base64 or URL
  }],
  
  // Status
  status: string,                   // 'draft' | 'pending_signature' | 'signed' | 'voided'
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
{ leaseId: 1 }
{ organizationId: 1, status: 1 }
```

#### 3. persta_screening_reports

**Purpose:** Tenant screening results

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,
  tenantId: ObjectId,               // Ref: persta_tenants
  
  // Report data
  creditScore?: number,
  criminalRecord?: boolean,
  evictionHistory?: boolean,
  employmentVerified?: boolean,
  incomeVerified?: boolean,
  referencesVerified?: boolean,
  
  // Decision
  recommendation: string,           // 'approve' | 'conditional' | 'reject'
  notes?: string,
  
  // Conducted by
  conductedBy?: ObjectId,
  conductedAt: Date,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
{ tenantId: 1 }
{ organizationId: 1, recommendation: 1 }
```

---

## Testa Database (tobiira_testa)

**Purpose:** Hotel management domain data

### Collections

#### 1. testa_guests

**Purpose:** Hotel guest profiles

```typescript
{
  _id: ObjectId,
  actorId: ObjectId,                // Ref: spatial_actors
  organizationId: ObjectId,
  
  // Personal info
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  dateOfBirth?: Date,
  
  // Identification
  passportNumber?: string,
  nationality?: string,
  
  // Loyalty program
  loyaltyTier?: string,             // 'bronze' | 'silver' | 'gold' | 'platinum'
  loyaltyPoints?: number,
  memberSince?: Date,
  
  // Preferences
  preferences?: {
    roomType?: string,
    floorPreference?: string,       // 'low' | 'mid' | 'high'
    smokingRoom?: boolean,
    bedType?: string,
    pillow?: string,
    specialRequests?: string
  },
  
  // Stay history
  totalStays?: number,
  totalNights?: number,
  totalSpent?: number,
  lastStayDate?: Date,
  
  // VIP status
  isVIP?: boolean,
  vipNotes?: string,
  
  // Status
  isActive: boolean,
  
  // Metadata
  metadata?: object,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
{ actorId: 1 } // unique
{ organizationId: 1, loyaltyTier: 1 }
{ email: 1, organizationId: 1 }
{ isVIP: 1, isActive: 1 }
```

#### 2. testa_loyalty_programs

**Purpose:** Loyalty program configurations

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,
  
  name: string,
  description?: string,
  
  // Tiers
  tiers: [{
    name: string,                   // 'bronze' | 'silver' | 'gold' | 'platinum'
    pointsRequired: number,
    benefits: string[],
    discount: number                // Percentage
  }],
  
  // Point rules
  pointsPerDollar: number,
  pointsPerNight: number,
  
  // Status
  isActive: boolean,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
{ organizationId: 1, isActive: 1 }
```

#### 3. testa_housekeeping_tasks

**Purpose:** Room cleaning schedules and tasks

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,
  
  roomId: ObjectId,                 // Ref: spatial_spaces
  reservationId?: ObjectId,         // Ref: spatial_occupancies
  
  taskType: string,                 // 'checkout_cleaning' | 'daily_cleaning' | 'deep_cleaning'
  priority: string,                 // 'low' | 'normal' | 'high' | 'urgent'
  
  // Assignment
  assignedTo?: ObjectId,            // Staff member
  assignedAt?: Date,
  
  // Timing
  scheduledAt: Date,
  startedAt?: Date,
  completedAt?: Date,
  
  // Status
  status: string,                   // 'pending' | 'in_progress' | 'completed' | 'skipped'
  
  // Notes
  notes?: string,
  issues?: string,
  
  // Inspection
  inspectedBy?: ObjectId,
  inspectedAt?: Date,
  inspectionPassed?: boolean,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
{ roomId: 1, scheduledAt: -1 }
{ organizationId: 1, status: 1 }
{ assignedTo: 1, status: 1 }
{ scheduledAt: 1, status: 1 }
```

---

## Costa Database (tobiira_costa)

**Purpose:** Commercial property management

### Collections

#### 1. costa_commercial_tenants

**Purpose:** Commercial tenant details

```typescript
{
  _id: ObjectId,
  actorId: ObjectId,
  organizationId: ObjectId,
  
  // Business info
  businessName: string,
  businessType: string,             // 'retail' | 'office' | 'warehouse' | 'restaurant'
  industry?: string,
  
  // Contact
  contactPerson: string,
  email: string,
  phone: string,
  
  // Legal
  registrationNumber?: string,
  taxId?: string,
  
  // Financial
  creditRating?: string,
  annualRevenue?: number,
  
  // Documents
  documents?: [{
    type: string,
    url: string,
    uploadedAt: Date
  }],
  
  // Status
  isActive: boolean,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
{ actorId: 1 }
{ organizationId: 1, businessType: 1 }
{ email: 1, organizationId: 1 }
```

---

## Bayra Database (tobiira_bayra)

**Purpose:** Car wash management

### Collections

#### 1. bayra_vehicles

**Purpose:** Customer vehicles

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,
  customerId: ObjectId,             // Ref: bayra_customers
  
  // Vehicle details
  make: string,
  model: string,
  year?: number,
  color?: string,
  
  // Registration
  licensePlate: string,
  vin?: string,
  
  // Preferences
  preferredServices?: string[],
  
  // History
  totalWashes?: number,
  lastWashDate?: Date,
  
  // Status
  isActive: boolean,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
{ customerId: 1 }
{ licensePlate: 1, organizationId: 1 }
{ organizationId: 1, isActive: 1 }
```

#### 2. bayra_customers

**Purpose:** Car wash customers

```typescript
{
  _id: ObjectId,
  actorId: ObjectId,
  organizationId: ObjectId,
  
  // Personal info
  firstName: string,
  lastName: string,
  email?: string,
  phone: string,
  
  // Loyalty
  loyaltyPoints?: number,
  membershipTier?: string,
  
  // History
  totalVisits?: number,
  totalSpent?: number,
  lastVisitDate?: Date,
  
  // Status
  isActive: boolean,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
{ actorId: 1 }
{ organizationId: 1, membershipTier: 1 }
{ phone: 1, organizationId: 1 }
```

#### 3. bayra_service_packages

**Purpose:** Service offerings

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,
  
  name: string,
  description?: string,
  
  // Pricing
  basePrice: number,
  currency: string,
  
  // Services included
  services: string[],
  
  // Duration
  estimatedDuration: number,        // in minutes
  
  // Status
  isActive: boolean,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

---

## Lumi Database (tobiira_lumi)

**Purpose:** Restaurant table management

### Collections

#### 1. lumi_dining_parties

**Purpose:** Dining party details

```typescript
{
  _id: ObjectId,
  actorId: ObjectId,
  organizationId: ObjectId,
  
  // Party info
  partyName?: string,
  contactPhone: string,
  partySize: number,
  
  // Preferences
  seatingPreference?: string,
  specialRequests?: string,
  
  // History
  totalVisits?: number,
  totalSpent?: number,
  lastVisitDate?: Date,
  
  // Status
  isActive: boolean,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
{ actorId: 1 }
{ contactPhone: 1, organizationId: 1 }
{ organizationId: 1, isActive: 1 }
```

#### 2. lumi_menu_items

**Purpose:** Restaurant menu

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,
  
  name: string,
  description?: string,
  category: string,
  
  // Pricing
  price: number,
  currency: string,
  
  // Availability
  isAvailable: boolean,
  
  // Metadata
  preparationTime?: number,
  allergens?: string[],
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

---

## Cross-Database Relationships

### Relationship Patterns

```
┌──────────────────┐
│  core_users      │
└────────┬─────────┘
         │
         ├─► core_memberships → core_organizations
         │
         └─► spatial_actors ─┬─► persta_tenants
                             ├─► testa_guests
                             ├─► costa_commercial_tenants
                             ├─► bayra_customers
                             └─► lumi_dining_parties

┌──────────────────┐
│ spatial_spaces   │
└────────┬─────────┘
         │
         └─► spatial_occupancies ─┬─► spatial_events
                                  └─► spatial_activities
```

### Join Strategy

**Rule:** No database joins at database level

**Pattern:** Join at application layer

```typescript
// ❌ BAD: Cannot do this across databases
Lease.aggregate([
  {
    $lookup: {
      from: 'persta_tenants',  // Different database!
      localField: 'actorId',
      foreignField: 'actorId',
      as: 'tenant'
    }
  }
]);

// ✅ GOOD: Application-level join
const lease = await Lease.findById(leaseId);
const tenant = await Tenant.findOne({ actorId: lease.actorId });

return {
  ...lease.toObject(),
  tenant: tenant.toObject()
};
```

---

## Indexes Strategy

### Index Types by Purpose

**1. Primary Keys:**
```javascript
{ _id: 1 }  // Automatic
```

**2. Foreign Keys:**
```javascript
{ userId: 1 }
{ organizationId: 1 }
{ actorId: 1 }
{ spaceId: 1 }
```

**3. Compound Indexes (common queries):**
```javascript
{ organizationId: 1, status: 1 }
{ spaceId: 1, scheduledStart: 1, scheduledEnd: 1 }
{ userId: 1, organizationId: 1 }
```

**4. Geospatial Indexes:**
```javascript
{ location: '2dsphere' }
```

**5. Time-Series Indexes:**
```javascript
{ occurredAt: -1 }
{ createdAt: -1 }
```

**6. Text Search Indexes (future):**
```javascript
{ name: 'text', description: 'text' }
```

### Index Guidelines

**Always index:**
- Foreign keys (organizationId, userId, actorId, spaceId, etc.)
- Status fields used in WHERE clauses
- Date fields used for sorting/filtering
- Fields used in compound WHERE clauses

**Compound index order:**
1. Equality filters (organizationId)
2. Sort fields (createdAt: -1)
3. Range filters (date ranges)

**Example:**
```javascript
// Query: Get active leases for org, sorted by start date
// Index: { organizationId: 1, status: 1, scheduledStart: -1 }

Lease.find({
  organizationId: 'org_123',
  status: 'active'
}).sort({ scheduledStart: -1 });
```

---

## Summary

### Database Distribution

| Layer | Database | Collections | Purpose |
|-------|----------|-------------|---------|
| **Core** | tobiira_core | 4 | Identity & auth |
| **Spatial** | tobiira_spatial | 5 | Shared primitives |
| **Persta** | tobiira_persta | 3+ | Residential domain |
| **Testa** | tobiira_testa | 3+ | Hotel domain |
| **Costa** | tobiira_costa | 2+ | Commercial domain |
| **Bayra** | tobiira_bayra | 3+ | Car wash domain |
| **Lumi** | tobiira_lumi | 2+ | Restaurant domain |

### Total: 7 databases, 22+ collections

---

**End of Database Schema Documentation**

*This schema enables clean domain separation while maintaining referential integrity at the application layer.*