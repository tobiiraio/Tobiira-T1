# Service Orchestration Examples

This document shows how vertical services (Persta, Testa) orchestrate across spatial primitives and vertical-specific models.

---

## Table of Contents

1. [Persta Service Examples](#persta-service-examples)
2. [Testa Service Examples](#testa-service-examples)
3. [Cross-Module Communication Patterns](#cross-module-communication-patterns)
4. [Event Flow Diagrams](#event-flow-diagrams)

---

## Persta Service Examples

### 1. Lease Management Service

**Purpose:** Orchestrate residential lease lifecycle

**Uses:**
- Spatial: `Property`, `Block`, `Unit`, `Lease`, `SpatialEvent`
- Vertical: `Tenant`
- Common: `AvailabilityCache`, `NotificationService`

```typescript
// verticals/persta/services/lease-management.service.ts
import { Unit } from '@/spatial/spaces/models/unit.model';
import { Property } from '@/spatial/spaces/models/property.model';
import { Lease } from '@/spatial/occupancies/models/lease-occupancy.model';
import { SpatialEvent } from '@/spatial/events/models/event.model';
import { Tenant } from '../models/tenant.model';
import { AvailabilityCacheService } from '@/common/cache/availability-cache';
import { NotificationService } from '@/core/notifications/services/notification.service';

export class LeaseManagementService {
  constructor(
    private availabilityCache: AvailabilityCacheService,
    private notificationService: NotificationService
  ) {}

  /**
   * CREATE LEASE - Full orchestration example
   */
  async createLease(data: {
    organizationId: string;
    propertyId: string;
    unitId: string;
    tenantId: string;
    startDate: Date;
    durationMonths: number;
    monthlyRent: number;
    securityDeposit: number;
  }) {
    // STEP 1: Validate property (spatial)
    const property = await Property.findOne({
      _id: data.propertyId,
      organizationId: data.organizationId,
      status: 'active'
    });
    
    if (!property) {
      throw new Error('Property not found or inactive');
    }

    // STEP 2: Validate unit exists and belongs to property (spatial)
    const unit = await Unit.findOne({
      _id: data.unitId,
      propertyId: data.propertyId,
      organizationId: data.organizationId,
      status: 'active'
    });
    
    if (!unit) {
      throw new Error('Unit not found or inactive');
    }

    // STEP 3: Validate tenant (vertical)
    const tenant = await Tenant.findOne({
      _id: data.tenantId,
      organizationId: data.organizationId
    });
    
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // STEP 4: Calculate lease end date
    const endDate = new Date(data.startDate);
    endDate.setMonth(endDate.getMonth() + data.durationMonths);

    // STEP 5: Check availability (common cache service)
    const isAvailable = await this.availabilityCache.checkAvailability(
      data.unitId,
      data.startDate,
      endDate
    );
    
    if (!isAvailable) {
      throw new Error('Unit is not available for these dates');
    }

    // STEP 6: Create lease (spatial occupancy)
    const lease = await Lease.create({
      // Organization context
      organizationId: data.organizationId,
      
      // Occupancy type
      occupancyType: 'lease',
      leaseType: 'residential',
      
      // Space reference (spatial)
      spaceId: data.unitId,
      spaceType: 'unit',
      
      // Actor reference (links to spatial actor)
      actorId: tenant.actorId,
      actorType: 'tenant',
      
      // Time (scheduled)
      scheduledStart: data.startDate,
      scheduledEnd: endDate,
      
      // Time (actual - lifecycle events)
      applicationSubmittedAt: new Date(),
      
      // Lease specifics
      monthlyRent: data.monthlyRent,
      securityDeposit: data.securityDeposit,
      currency: 'UGX',
      durationMonths: data.durationMonths,
      
      // Status
      status: 'pending'
    });

    // STEP 7: Invalidate availability cache (common)
    await this.availabilityCache.invalidateCache(
      data.unitId,
      data.startDate,
      endDate
    );

    // STEP 8: Record event (spatial events)
    await SpatialEvent.create({
      organizationId: data.organizationId,
      spaceId: data.unitId,
      occupancyId: lease._id,
      actorId: tenant.actorId,
      activityType: 'lease_application_submitted',
      occurredAt: new Date(),
      spaceType: 'unit',
      actorType: 'tenant',
      metadata: {
        propertyName: property.name,
        unitNumber: unit.unitNumber,
        monthlyRent: data.monthlyRent,
        durationMonths: data.durationMonths
      },
      source: 'persta'
    });

    // STEP 9: Send notification (core service)
    await this.notificationService.sendEmail({
      to: tenant.email,
      template: 'lease_application_received',
      data: {
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        propertyName: property.name,
        unitNumber: unit.unitNumber,
        startDate: data.startDate,
        monthlyRent: data.monthlyRent
      }
    });

    return {
      lease,
      unit,
      tenant,
      property
    };
  }

  /**
   * APPROVE LEASE
   */
  async approveLease(leaseId: string, approvedBy: string) {
    // Get lease
    const lease = await Lease.findById(leaseId);
    
    if (!lease) {
      throw new Error('Lease not found');
    }
    
    if (lease.status !== 'pending') {
      throw new Error('Only pending leases can be approved');
    }

    // Update lease
    lease.approvedAt = new Date();
    lease.status = 'confirmed';
    await lease.save();

    // Record event
    await SpatialEvent.create({
      organizationId: lease.organizationId,
      spaceId: lease.spaceId,
      occupancyId: lease._id,
      actorId: approvedBy,
      activityType: 'lease_approved',
      occurredAt: new Date(),
      metadata: {
        approvedBy
      },
      source: 'persta'
    });

    // Get tenant for notification
    const tenant = await Tenant.findOne({ actorId: lease.actorId });
    
    if (tenant) {
      await this.notificationService.sendEmail({
        to: tenant.email,
        template: 'lease_approved',
        data: {
          tenantName: `${tenant.firstName} ${tenant.lastName}`,
          approvedAt: lease.approvedAt
        }
      });
    }

    return lease;
  }

  /**
   * SIGN LEASE
   */
  async signLease(leaseId: string, signatureData: any) {
    const lease = await Lease.findById(leaseId);
    
    if (!lease) {
      throw new Error('Lease not found');
    }
    
    if (!lease.approvedAt) {
      throw new Error('Lease must be approved before signing');
    }

    // Update lease
    lease.signedAt = new Date();
    lease.status = 'confirmed';
    await lease.save();

    // Record event
    await SpatialEvent.create({
      organizationId: lease.organizationId,
      spaceId: lease.spaceId,
      occupancyId: lease._id,
      actorId: lease.actorId,
      activityType: 'lease_signed',
      occurredAt: new Date(),
      metadata: {
        signedAt: lease.signedAt
      },
      source: 'persta'
    });

    return lease;
  }

  /**
   * MOVE IN
   */
  async recordMoveIn(leaseId: string) {
    const lease = await Lease.findById(leaseId);
    
    if (!lease) {
      throw new Error('Lease not found');
    }
    
    if (!lease.signedAt) {
      throw new Error('Lease must be signed before move-in');
    }

    // Update lease
    lease.moveInAt = new Date();
    lease.actualStart = new Date();
    lease.status = 'active';
    await lease.save();

    // Record event
    await SpatialEvent.create({
      organizationId: lease.organizationId,
      spaceId: lease.spaceId,
      occupancyId: lease._id,
      actorId: lease.actorId,
      activityType: 'tenant_moved_in',
      occurredAt: new Date(),
      metadata: {
        scheduledStart: lease.scheduledStart,
        actualStart: lease.actualStart
      },
      source: 'persta'
    });

    return lease;
  }

  /**
   * TERMINATE LEASE EARLY
   */
  async terminateLease(leaseId: string, reason: string) {
    const lease = await Lease.findById(leaseId);
    
    if (!lease) {
      throw new Error('Lease not found');
    }

    // Update lease
    lease.terminatedAt = new Date();
    lease.actualEnd = new Date();
    lease.status = 'cancelled';
    await lease.save();

    // Invalidate cache - space is now available
    await this.availabilityCache.invalidateCache(
      lease.spaceId,
      lease.scheduledStart,
      lease.scheduledEnd
    );

    // Record event
    await SpatialEvent.create({
      organizationId: lease.organizationId,
      spaceId: lease.spaceId,
      occupancyId: lease._id,
      actorId: lease.actorId,
      activityType: 'lease_terminated',
      occurredAt: new Date(),
      metadata: {
        reason,
        scheduledEnd: lease.scheduledEnd,
        actualEnd: lease.actualEnd
      },
      source: 'persta'
    });

    return lease;
  }

  /**
   * GET ACTIVE LEASES BY PROPERTY
   */
  async getActiveLeasesByProperty(propertyId: string) {
    // Get all units in property (spatial)
    const units = await Unit.find({ propertyId });
    const unitIds = units.map(u => u._id.toString());

    // Get active leases (spatial)
    const leases = await Lease.find({
      spaceId: { $in: unitIds },
      status: 'active'
    });

    // Enrich with unit and tenant data
    const enrichedLeases = await Promise.all(
      leases.map(async (lease) => {
        const unit = units.find(u => u._id.toString() === lease.spaceId);
        const tenant = await Tenant.findOne({ actorId: lease.actorId });
        
        return {
          lease: lease.toObject(),
          unit: unit?.toObject(),
          tenant: tenant?.toObject()
        };
      })
    );

    return enrichedLeases;
  }
}
```

### 2. Rent Collection Service

```typescript
// verticals/persta/services/rent-collection.service.ts
import { Lease } from '@/spatial/occupancies/models/lease-occupancy.model';
import { Payment } from '@/spatial/activities/models/payment.model';
import { SpatialEvent } from '@/spatial/events/models/event.model';
import { Tenant } from '../models/tenant.model';
import { NotificationService } from '@/core/notifications/services/notification.service';

export class RentCollectionService {
  constructor(private notificationService: NotificationService) {}

  /**
   * GENERATE RENT INVOICE
   */
  async generateRentInvoice(leaseId: string, month: Date) {
    const lease = await Lease.findById(leaseId);
    
    if (!lease) {
      throw new Error('Lease not found');
    }
    
    if (lease.status !== 'active') {
      throw new Error('Can only generate invoices for active leases');
    }

    // Calculate due date (1st of month)
    const dueDate = new Date(month);
    dueDate.setDate(1);

    // Create payment record (spatial activity)
    const payment = await Payment.create({
      organizationId: lease.organizationId,
      occupancyId: lease._id,
      actorId: lease.actorId,
      
      amount: lease.monthlyRent,
      currency: lease.currency,
      
      dueAt: dueDate,
      status: 'pending',
      
      paymentType: 'rent',
      metadata: {
        month: month.toISOString(),
        leaseId: lease._id
      }
    });

    // Record event
    await SpatialEvent.create({
      organizationId: lease.organizationId,
      spaceId: lease.spaceId,
      occupancyId: lease._id,
      actorId: lease.actorId,
      activityType: 'rent_invoice_generated',
      occurredAt: new Date(),
      metadata: {
        amount: lease.monthlyRent,
        dueDate: dueDate,
        month: month.toISOString()
      },
      source: 'persta'
    });

    // Send notification
    const tenant = await Tenant.findOne({ actorId: lease.actorId });
    
    if (tenant) {
      await this.notificationService.sendEmail({
        to: tenant.email,
        template: 'rent_invoice',
        data: {
          tenantName: `${tenant.firstName} ${tenant.lastName}`,
          amount: lease.monthlyRent,
          dueDate: dueDate,
          month: month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        }
      });
    }

    return payment;
  }

  /**
   * RECORD RENT PAYMENT
   */
  async recordRentPayment(
    paymentId: string,
    paymentData: {
      paidAt: Date;
      paymentMethod: string;
      transactionId?: string;
    }
  ) {
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Update payment
    payment.paidAt = paymentData.paidAt;
    payment.paymentMethod = paymentData.paymentMethod;
    payment.status = 'completed';
    payment.metadata = {
      ...payment.metadata,
      transactionId: paymentData.transactionId
    };
    await payment.save();

    // Get lease
    const lease = await Lease.findById(payment.occupancyId);

    // Record event
    await SpatialEvent.create({
      organizationId: payment.organizationId,
      spaceId: lease?.spaceId!,
      occupancyId: payment.occupancyId!,
      actorId: payment.actorId,
      activityType: 'rent_paid',
      occurredAt: paymentData.paidAt,
      metadata: {
        amount: payment.amount,
        paymentMethod: paymentData.paymentMethod,
        onTime: paymentData.paidAt <= payment.dueAt
      },
      source: 'persta'
    });

    return payment;
  }

  /**
   * SEND RENT REMINDERS
   */
  async sendRentReminders() {
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    // Find upcoming unpaid rent
    const upcomingPayments = await Payment.find({
      status: 'pending',
      paymentType: 'rent',
      dueAt: {
        $gte: today,
        $lte: threeDaysFromNow
      }
    });

    for (const payment of upcomingPayments) {
      const lease = await Lease.findById(payment.occupancyId);
      const tenant = await Tenant.findOne({ actorId: payment.actorId });

      if (tenant && lease) {
        await this.notificationService.sendEmail({
          to: tenant.email,
          template: 'rent_reminder',
          data: {
            tenantName: `${tenant.firstName} ${tenant.lastName}`,
            amount: payment.amount,
            dueDate: payment.dueAt
          }
        });

        // Update payment metadata to track reminder sent
        payment.metadata = {
          ...payment.metadata,
          reminderSent: new Date()
        };
        await payment.save();
      }
    }

    return upcomingPayments.length;
  }
}
```

---

## Testa Service Examples

### 1. Reservation Service

**Purpose:** Orchestrate hotel reservation lifecycle

**Uses:**
- Spatial: `Property`, `Block`, `Room`, `Reservation`, `SpatialEvent`
- Vertical: `Guest`
- Common: `AvailabilityCache`, `NotificationService`

```typescript
// verticals/testa/services/reservation.service.ts
import { Room } from '@/spatial/spaces/models/room.model';
import { Property } from '@/spatial/spaces/models/property.model';
import { Reservation } from '@/spatial/occupancies/models/reservation-occupancy.model';
import { SpatialEvent } from '@/spatial/events/models/event.model';
import { Guest } from '../models/guest.model';
import { AvailabilityCacheService } from '@/common/cache/availability-cache';
import { NotificationService } from '@/core/notifications/services/notification.service';
import { RateManagementService } from './rate-management.service';

export class ReservationService {
  constructor(
    private availabilityCache: AvailabilityCacheService,
    private notificationService: NotificationService,
    private rateManagement: RateManagementService
  ) {}

  /**
   * CREATE RESERVATION - Full orchestration
   */
  async createReservation(data: {
    organizationId: string;
    propertyId: string;
    roomId: string;
    guestInfo: {
      email: string;
      firstName: string;
      lastName: string;
      phone: string;
    };
    checkIn: Date;
    checkOut: Date;
    numberOfGuests: number;
    specialRequests?: string;
    bookingChannel?: string;
  }) {
    // STEP 1: Validate hotel (spatial)
    const hotel = await Property.findOne({
      _id: data.propertyId,
      organizationId: data.organizationId,
      propertyType: 'hotel',
      status: 'active'
    });
    
    if (!hotel) {
      throw new Error('Hotel not found or inactive');
    }

    // STEP 2: Validate room (spatial)
    const room = await Room.findOne({
      _id: data.roomId,
      propertyId: data.propertyId,
      organizationId: data.organizationId,
      status: 'active'
    });
    
    if (!room) {
      throw new Error('Room not found or inactive');
    }

    // Validate guest capacity
    if (data.numberOfGuests > room.maxOccupancy) {
      throw new Error(`Room can accommodate max ${room.maxOccupancy} guests`);
    }

    // STEP 3: Get or create guest (vertical)
    let guest = await Guest.findOne({
      email: data.guestInfo.email,
      organizationId: data.organizationId
    });

    if (!guest) {
      // Create new guest
      guest = await Guest.create({
        organizationId: data.organizationId,
        actorId: 'temp', // Will link to actor later
        ...data.guestInfo,
        totalStays: 0,
        totalSpent: 0,
        loyaltyPoints: 0
      });
    }

    // STEP 4: Check availability (common)
    const isAvailable = await this.availabilityCache.checkAvailability(
      data.roomId,
      data.checkIn,
      data.checkOut
    );
    
    if (!isAvailable) {
      throw new Error('Room is not available for selected dates');
    }

    // STEP 5: Calculate pricing (vertical - dynamic rates)
    const nights = this.calculateNights(data.checkIn, data.checkOut);
    const pricing = await this.rateManagement.calculateRate({
      room,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      numberOfNights: nights,
      guestLoyaltyTier: guest.loyaltyTier,
      bookingChannel: data.bookingChannel
    });

    // STEP 6: Create reservation (spatial)
    const reservation = await Reservation.create({
      // Organization
      organizationId: data.organizationId,
      
      // Occupancy type
      occupancyType: 'reservation',
      
      // Space reference
      spaceId: data.roomId,
      spaceType: 'room',
      
      // Actor reference
      actorId: guest._id,
      actorType: 'guest',
      
      // Time
      scheduledStart: data.checkIn,
      scheduledEnd: data.checkOut,
      bookedAt: new Date(),
      
      // Reservation details
      numberOfGuests: data.numberOfGuests,
      ratePerNight: pricing.ratePerNight,
      totalNights: nights,
      totalAmount: pricing.totalAmount,
      currency: room.currency,
      specialRequests: data.specialRequests,
      bookingChannel: data.bookingChannel,
      
      // Status
      status: 'pending'
    });

    // STEP 7: Invalidate cache
    await this.availabilityCache.invalidateCache(
      data.roomId,
      data.checkIn,
      data.checkOut
    );

    // STEP 8: Record event
    await SpatialEvent.create({
      organizationId: data.organizationId,
      spaceId: data.roomId,
      occupancyId: reservation._id,
      actorId: guest._id,
      activityType: 'reservation_created',
      occurredAt: new Date(),
      spaceType: 'room',
      actorType: 'guest',
      metadata: {
        hotelName: hotel.name,
        roomNumber: room.roomNumber,
        totalNights: nights,
        totalAmount: pricing.totalAmount,
        numberOfGuests: data.numberOfGuests,
        bookingChannel: data.bookingChannel
      },
      source: 'testa'
    });

    // STEP 9: Send confirmation email
    await this.notificationService.sendEmail({
      to: guest.email,
      template: 'reservation_confirmation',
      data: {
        guestName: `${guest.firstName} ${guest.lastName}`,
        hotelName: hotel.name,
        roomNumber: room.roomNumber,
        roomType: room.roomType,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        numberOfNights: nights,
        totalAmount: pricing.totalAmount,
        confirmationNumber: reservation._id
      }
    });

    return {
      reservation,
      room,
      guest,
      hotel,
      pricing
    };
  }

  /**
   * CONFIRM RESERVATION (after payment)
   */
  async confirmReservation(reservationId: string, paymentId: string) {
    const reservation = await Reservation.findById(reservationId);
    
    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Update reservation
    reservation.confirmedAt = new Date();
    reservation.status = 'confirmed';
    reservation.metadata = {
      ...reservation.metadata,
      paymentId
    };
    await reservation.save();

    // Record event
    await SpatialEvent.create({
      organizationId: reservation.organizationId,
      spaceId: reservation.spaceId,
      occupancyId: reservation._id,
      actorId: reservation.actorId,
      activityType: 'reservation_confirmed',
      occurredAt: new Date(),
      metadata: {
        paymentId
      },
      source: 'testa'
    });

    // Send confirmation
    const guest = await Guest.findById(reservation.actorId);
    
    if (guest) {
      await this.notificationService.sendEmail({
        to: guest.email,
        template: 'payment_received',
        data: {
          guestName: `${guest.firstName} ${guest.lastName}`,
          confirmationNumber: reservation._id
        }
      });
    }

    return reservation;
  }

  /**
   * CHECK IN
   */
  async checkIn(reservationId: string, actualCheckInTime?: Date) {
    const reservation = await Reservation.findById(reservationId);
    
    if (!reservation) {
      throw new Error('Reservation not found');
    }
    
    if (reservation.status !== 'confirmed') {
      throw new Error('Only confirmed reservations can be checked in');
    }

    const checkInTime = actualCheckInTime || new Date();

    // Update reservation
    reservation.checkedInAt = checkInTime;
    reservation.actualStart = checkInTime;
    reservation.status = 'active';
    await reservation.save();

    // Record event
    await SpatialEvent.create({
      organizationId: reservation.organizationId,
      spaceId: reservation.spaceId,
      occupancyId: reservation._id,
      actorId: reservation.actorId,
      activityType: 'guest_checked_in',
      occurredAt: checkInTime,
      metadata: {
        scheduledCheckIn: reservation.scheduledStart,
        actualCheckIn: checkInTime,
        earlyCheckIn: checkInTime < reservation.scheduledStart
      },
      source: 'testa'
    });

    // Update guest stats
    const guest = await Guest.findById(reservation.actorId);
    if (guest) {
      guest.totalStays = (guest.totalStays || 0) + 1;
      guest.lastStayDate = checkInTime;
      await guest.save();
    }

    return reservation;
  }

  /**
   * CHECK OUT
   */
  async checkOut(reservationId: string, actualCheckOutTime?: Date) {
    const reservation = await Reservation.findById(reservationId);
    
    if (!reservation) {
      throw new Error('Reservation not found');
    }
    
    if (reservation.status !== 'active') {
      throw new Error('Only active reservations can be checked out');
    }

    const checkOutTime = actualCheckOutTime || new Date();

    // Update reservation
    reservation.checkedOutAt = checkOutTime;
    reservation.actualEnd = checkOutTime;
    reservation.status = 'completed';
    await reservation.save();

    // Invalidate cache (room now available)
    await this.availabilityCache.invalidateCache(
      reservation.spaceId,
      reservation.scheduledStart,
      reservation.scheduledEnd
    );

    // Record event
    await SpatialEvent.create({
      organizationId: reservation.organizationId,
      spaceId: reservation.spaceId,
      occupancyId: reservation._id,
      actorId: reservation.actorId,
      activityType: 'guest_checked_out',
      occurredAt: checkOutTime,
      metadata: {
        scheduledCheckOut: reservation.scheduledEnd,
        actualCheckOut: checkOutTime,
        lateCheckOut: checkOutTime > reservation.scheduledEnd
      },
      source: 'testa'
    });

    // Update guest stats
    const guest = await Guest.findById(reservation.actorId);
    if (guest) {
      guest.totalSpent = (guest.totalSpent || 0) + reservation.totalAmount;
      
      // Award loyalty points (1 point per dollar spent)
      const pointsEarned = Math.floor(reservation.totalAmount);
      guest.loyaltyPoints = (guest.loyaltyPoints || 0) + pointsEarned;
      
      await guest.save();
    }

    return reservation;
  }

  /**
   * CANCEL RESERVATION
   */
  async cancelReservation(reservationId: string, reason: string) {
    const reservation = await Reservation.findById(reservationId);
    
    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Update reservation
    reservation.cancelledAt = new Date();
    reservation.status = 'cancelled';
    reservation.metadata = {
      ...reservation.metadata,
      cancellationReason: reason
    };
    await reservation.save();

    // Make room available again
    await this.availabilityCache.invalidateCache(
      reservation.spaceId,
      reservation.scheduledStart,
      reservation.scheduledEnd
    );

    // Record event
    await SpatialEvent.create({
      organizationId: reservation.organizationId,
      spaceId: reservation.spaceId,
      occupancyId: reservation._id,
      actorId: reservation.actorId,
      activityType: 'reservation_cancelled',
      occurredAt: new Date(),
      metadata: {
        reason,
        refundAmount: this.calculateRefund(reservation)
      },
      source: 'testa'
    });

    return reservation;
  }

  private calculateNights(checkIn: Date, checkOut: Date): number {
    const diff = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  private calculateRefund(reservation: Reservation): number {
    // Simple refund logic - can be enhanced
    const daysUntilCheckIn = Math.ceil(
      (reservation.scheduledStart.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilCheckIn > 7) return reservation.totalAmount;
    if (daysUntilCheckIn > 3) return reservation.totalAmount * 0.5;
    return 0;
  }
}
```

### 2. Rate Management Service

```typescript
// verticals/testa/services/rate-management.service.ts
import { Room } from '@/spatial/spaces/models/room.model';
import { Reservation } from '@/spatial/occupancies/models/reservation-occupancy.model';

export class RateManagementService {
  /**
   * CALCULATE DYNAMIC RATE
   */
  async calculateRate(params: {
    room: any;
    checkIn: Date;
    checkOut: Date;
    numberOfNights: number;
    guestLoyaltyTier?: string;
    bookingChannel?: string;
  }) {
    let ratePerNight = params.room.baseRate;

    // Apply demand-based pricing
    const demandMultiplier = await this.getDemandMultiplier(
      params.room.propertyId,
      params.checkIn,
      params.checkOut
    );
    ratePerNight *= demandMultiplier;

    // Apply seasonal pricing
    const seasonalMultiplier = this.getSeasonalMultiplier(params.checkIn);
    ratePerNight *= seasonalMultiplier;

    // Apply loyalty discount
    if (params.guestLoyaltyTier) {
      const loyaltyDiscount = this.getLoyaltyDiscount(params.guestLoyaltyTier);
      ratePerNight *= (1 - loyaltyDiscount);
    }

    // Apply channel markup/discount
    if (params.bookingChannel) {
      const channelMultiplier = this.getChannelMultiplier(params.bookingChannel);
      ratePerNight *= channelMultiplier;
    }

    const totalAmount = ratePerNight * params.numberOfNights;

    return {
      baseRate: params.room.baseRate,
      ratePerNight: Math.round(ratePerNight),
      totalAmount: Math.round(totalAmount),
      numberOfNights: params.numberOfNights,
      breakdown: {
        demandMultiplier,
        seasonalMultiplier,
        loyaltyDiscount: params.guestLoyaltyTier ? this.getLoyaltyDiscount(params.guestLoyaltyTier) : 0,
        channelMultiplier: params.bookingChannel ? this.getChannelMultiplier(params.bookingChannel) : 1
      }
    };
  }

  /**
   * Get demand multiplier based on current occupancy
   */
  private async getDemandMultiplier(
    propertyId: string,
    checkIn: Date,
    checkOut: Date
  ): Promise<number> {
    // Count total rooms
    const totalRooms = await Room.countDocuments({
      propertyId,
      status: 'active'
    });

    // Count booked rooms in date range
    const roomIds = await Room.find({ propertyId }).distinct('_id');
    
    const bookedRooms = await Reservation.countDocuments({
      spaceId: { $in: roomIds },
      status: { $in: ['confirmed', 'active'] },
      scheduledStart: { $lt: checkOut },
      scheduledEnd: { $gt: checkIn }
    });

    const occupancyRate = bookedRooms / totalRooms;

    // Pricing tiers based on occupancy
    if (occupancyRate > 0.9) return 1.5;  // 90%+ → +50%
    if (occupancyRate > 0.7) return 1.3;  // 70%+ → +30%
    if (occupancyRate > 0.5) return 1.1;  // 50%+ → +10%
    if (occupancyRate < 0.3) return 0.9;  // <30% → -10%
    return 1.0;
  }

  /**
   * Get seasonal multiplier
   */
  private getSeasonalMultiplier(date: Date): number {
    const month = date.getMonth();
    
    // Peak season (Dec, Jan, Jul, Aug)
    if ([0, 6, 7, 11].includes(month)) return 1.2;
    
    // Shoulder season
    if ([3, 4, 9, 10].includes(month)) return 1.0;
    
    // Low season
    return 0.9;
  }

  /**
   * Get loyalty discount
   */
  private getLoyaltyDiscount(tier: string): number {
    const discounts: Record<string, number> = {
      bronze: 0.05,   // 5%
      silver: 0.10,   // 10%
      gold: 0.15,     // 15%
      platinum: 0.20  // 20%
    };
    
    return discounts[tier] || 0;
  }

  /**
   * Get channel multiplier
   */
  private getChannelMultiplier(channel: string): number {
    const multipliers: Record<string, number> = {
      direct: 1.0,        // No markup
      'booking.com': 1.15, // +15% commission
      airbnb: 1.18,       // +18% commission
      expedia: 1.15       // +15% commission
    };
    
    return multipliers[channel] || 1.0;
  }
}
```

---

## Cross-Module Communication Patterns

### Pattern 1: Spatial → Vertical

```typescript
// Spatial provides primitives, vertical adds semantics

// Spatial: Base occupancy
const lease = await Lease.findById(leaseId);

// Vertical: Enrich with domain data
const tenant = await Tenant.findOne({ actorId: lease.actorId });

return {
  ...lease.toObject(),
  tenant: {
    name: `${tenant.firstName} ${tenant.lastName}`,
    email: tenant.email,
    // ... residential-specific fields
  }
};
```

### Pattern 2: Vertical → Spatial

```typescript
// Vertical orchestrates spatial primitives

// 1. Validate vertical data
const tenant = await Tenant.findById(tenantId);

// 2. Use spatial primitives
const unit = await Unit.findById(unitId);
const lease = await Lease.create({ ... });

// 3. Record in spatial events
await SpatialEvent.create({ ... });
```

### Pattern 3: Vertical → Common → Spatial

```typescript
// Vertical uses common services that interact with spatial

// Vertical service
await this.availabilityCache.checkAvailability(...);

// Common service (availability-cache)
// → queries Occupancy (spatial)
// → caches in Redis
// → returns to vertical
```

---

## Event Flow Diagrams

### Lease Creation Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /api/persta/leases
       ▼
┌──────────────────────┐
│ LeaseController      │
└──────┬───────────────┘
       │ createLease()
       ▼
┌──────────────────────┐
│ LeaseManagementService│ ◄─── VERTICAL
└──────┬───────────────┘
       │
       ├─► Property.findById()        ◄─── SPATIAL
       ├─► Unit.findById()            ◄─── SPATIAL
       ├─► Tenant.findById()          ◄─── VERTICAL
       ├─► availabilityCache.check()  ◄─── COMMON
       ├─► Lease.create()             ◄─── SPATIAL
       ├─► availabilityCache.invalidate() ◄─── COMMON
       ├─► SpatialEvent.create()      ◄─── SPATIAL
       └─► NotificationService.send() ◄─── CORE
       
       ▼
    Success
```

### Reservation Check-in Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /api/testa/reservations/:id/check-in
       ▼
┌──────────────────────┐
│ ReservationController│
└──────┬───────────────┘
       │ checkIn()
       ▼
┌──────────────────────┐
│ ReservationService   │ ◄─── VERTICAL
└──────┬───────────────┘
       │
       ├─► Reservation.findById()     ◄─── SPATIAL
       ├─► Reservation.update()       ◄─── SPATIAL
       ├─► Guest.update()             ◄─── VERTICAL (stats)
       ├─► SpatialEvent.create()      ◄─── SPATIAL
       └─► HousekeepingService.notify() ◄─── VERTICAL
       
       ▼
    Success
```

---

**End of Service Orchestration Examples**

*These patterns enable clean separation of concerns while maintaining flexibility.*