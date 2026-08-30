import { Types } from 'mongoose';
import { AuditLogModel, IAuditLog } from '../models/audit-log.model';

export class AuditLogRepository {
  async findMany(
    businessId: string | Types.ObjectId,
    limit = 50,
    skip = 0
  ): Promise<IAuditLog[]> {
    const bId = new Types.ObjectId(businessId.toString());
    return AuditLogModel.find({ businessId: bId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  async log(businessId: string | Types.ObjectId, data: Partial<IAuditLog>): Promise<IAuditLog> {
    const bId = new Types.ObjectId(businessId.toString());
    const auditLog = new AuditLogModel({ ...data, businessId: bId });
    return auditLog.save();
  }
}

export const auditLogRepository = new AuditLogRepository();
