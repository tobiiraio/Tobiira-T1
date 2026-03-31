import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, PaymentDocument, PaymentMethod, PaymentSource, PaymentStatus } from './schemas/payment.schema';

@Injectable()
export class PaymentsRepository {
  constructor(
    @InjectModel(Payment.name, 'payments')
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  async create(params: {
    organizationId: string;
    resourceType: string;
    resourceId: string;
    payerId: string;
    payerEmail: string;
    payerName?: string;
    amount: number;
    currency: string;
    method: PaymentMethod;
    reference?: string;
    periodCovered?: { from: Date; to: Date };
    paidAt: Date;
    notes?: string;
    recordedByUserId: string;
    source?: PaymentSource;
  }): Promise<PaymentDocument> {
    return this.paymentModel.create({
      organizationId: new Types.ObjectId(params.organizationId),
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      payerId: new Types.ObjectId(params.payerId),
      payerEmail: params.payerEmail,
      payerName: params.payerName,
      amount: params.amount,
      currency: params.currency.toUpperCase(),
      method: params.method,
      reference: params.reference,
      periodCovered: params.periodCovered,
      paidAt: params.paidAt,
      notes: params.notes,
      recordedByUserId: new Types.ObjectId(params.recordedByUserId),
      source: params.source ?? 'manual',
      status: 'recorded',
      voidedAt: null,
      voidedByUserId: null,
    });
  }

  async findById(id: string): Promise<PaymentDocument | null> {
    return this.paymentModel.findById(new Types.ObjectId(id)).exec();
  }

  async findByResource(
    params: { organizationId: string; resourceType: string; resourceId: string },
    pagination: { limit: number; offset: number },
  ): Promise<PaymentDocument[]> {
    return this.paymentModel
      .find({
        organizationId: new Types.ObjectId(params.organizationId),
        resourceType: params.resourceType,
        resourceId: params.resourceId,
      })
      .sort({ paidAt: -1 })
      .skip(pagination.offset)
      .limit(pagination.limit)
      .exec();
  }

  async findByOrganization(
    organizationId: string,
    filters: { status?: PaymentStatus; payerId?: string; resourceType?: string },
    pagination: { limit: number; offset: number },
  ): Promise<PaymentDocument[]> {
    const query: Record<string, unknown> = {
      organizationId: new Types.ObjectId(organizationId),
    };
    if (filters.status) query.status = filters.status;
    if (filters.payerId) query.payerId = new Types.ObjectId(filters.payerId);
    if (filters.resourceType) query.resourceType = filters.resourceType;

    return this.paymentModel
      .find(query)
      .sort({ paidAt: -1 })
      .skip(pagination.offset)
      .limit(pagination.limit)
      .exec();
  }

  async void(params: {
    id: string;
    voidedByUserId: string;
    voidedAt: Date;
    voidReason?: string;
  }): Promise<PaymentDocument | null> {
    return this.paymentModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(params.id), status: 'recorded' },
        {
          $set: {
            status: 'voided',
            voidedAt: params.voidedAt,
            voidedByUserId: new Types.ObjectId(params.voidedByUserId),
            voidReason: params.voidReason,
          },
        },
        { new: true },
      )
      .exec();
  }
}
