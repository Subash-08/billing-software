import { Types } from 'mongoose';
import { AttachmentModel, IAttachment } from '../models/attachment.model';

export class AttachmentRepository {
  async findByEntity(
    businessId: string | Types.ObjectId,
    entityType: 'INVOICE' | 'CUSTOMER' | 'BUSINESS' | 'PAYMENT',
    entityId: string | Types.ObjectId
  ): Promise<IAttachment[]> {
    const bId = new Types.ObjectId(businessId.toString());
    const eId = new Types.ObjectId(entityId.toString());
    return AttachmentModel.find({ businessId: bId, entityType, entityId: eId }).exec();
  }

  async findById(
    businessId: string | Types.ObjectId,
    attachmentId: string | Types.ObjectId
  ): Promise<IAttachment | null> {
    const bId = new Types.ObjectId(businessId.toString());
    const aId = new Types.ObjectId(attachmentId.toString());
    return AttachmentModel.findOne({ _id: aId, businessId: bId }).exec();
  }

  async create(businessId: string | Types.ObjectId, data: Partial<IAttachment>): Promise<IAttachment> {
    const bId = new Types.ObjectId(businessId.toString());
    const attachment = new AttachmentModel({ ...data, businessId: bId });
    return attachment.save();
  }

  async delete(
    businessId: string | Types.ObjectId,
    attachmentId: string | Types.ObjectId
  ): Promise<IAttachment | null> {
    const bId = new Types.ObjectId(businessId.toString());
    const aId = new Types.ObjectId(attachmentId.toString());
    return AttachmentModel.findOneAndDelete({ _id: aId, businessId: bId }).exec();
  }
}

export const attachmentRepository = new AttachmentRepository();
