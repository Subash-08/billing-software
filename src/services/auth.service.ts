import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { UserModel, IUser } from '@/db/models/user.model';
import { BusinessModel, IBusiness } from '@/db/models/business.model';
import { hashPassword, verifyPassword, setSessionCookie, clearSessionCookie } from '@/lib/auth';
import { registerSchema, loginSchema, RegisterInput, LoginInput } from '@/validations/auth.schema';
import { ValidationError, AuthenticationError, BusinessRuleError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export class AuthService {
  /**
   * Progressive Registration: Atomically creates User and Business records.
   * Performs compensating cleanup if Business creation fails to prevent orphan users.
   */
  async registerUserWithBusiness(input: RegisterInput): Promise<{ user: IUser; business: IBusiness }> {
    const validated = registerSchema.parse(input);
    await connectToDatabase();

    // Check for existing user
    const existingUser = await UserModel.findOne({ email: validated.email });
    if (existingUser) {
      throw new ValidationError('An account with this email address already exists');
    }

    // 1. Create User Identity
    const passwordHash = await hashPassword(validated.password);
    const user = await UserModel.create({
      email: validated.email,
      passwordHash,
      isEmailVerified: false,
    });

    try {
      // 2. Create Business Root linked 1:1 to User
      const business = await BusinessModel.create({
        userId: user._id,
        legalName: validated.businessName,
        phone: validated.phone,
        email: validated.businessEmail || validated.email,
        gstRegistrationType: validated.gstRegistrationType,
        gstin: validated.gstin || undefined,
        gstinStatus: validated.gstin ? 'NOT_VALIDATED' : 'NOT_VALIDATED',
        stateCode: validated.stateCode,
        address: validated.address,
        city: validated.city,
        state: validated.state,
        pincode: validated.pincode,
      });

      // 3. Set Session Cookie for immediate login
      await setSessionCookie(user._id.toString());
      logger.info(`User registered successfully with Business: ${user.email} -> ${business.legalName}`);

      return { user, business };
    } catch (error) {
      // Compensating Cleanup if Business creation fails
      logger.error('Business creation failed during registration; rolling back User record.', { error: String(error) });
      await UserModel.findByIdAndDelete(user._id.toString());
      throw new BusinessRuleError('Failed to initialize business profile during registration. Please try again.');
    }
  }

  /**
   * Creates a Business document for an existing User who completed Step 1 (or suffered partial setup failure).
   */
  async completeBusinessOnboarding(userId: string, businessData: {
    legalName: string;
    phone: string;
    email?: string;
    gstRegistrationType: 'REGULAR' | 'COMPOSITION' | 'UNREGISTERED' | 'SEZ' | 'OTHER';
    gstin?: string;
    stateCode: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  }): Promise<IBusiness> {
    await connectToDatabase();

    const existingBusiness = await BusinessModel.findOne({ userId });
    if (existingBusiness) {
      return existingBusiness;
    }

    const business = await BusinessModel.create({
      userId,
      ...businessData,
    });

    logger.info(`Completed Business onboarding for User ID ${userId}: ${business.legalName}`);
    return business;
  }

  /**
   * Authenticates user with email and password.
   */
  async loginUser(input: LoginInput): Promise<{ user: IUser }> {
    const validated = loginSchema.parse(input);
    await connectToDatabase();

    const user = await UserModel.findOne({ email: validated.email });
    if (!user) {
      throw new AuthenticationError('Invalid email address or password');
    }

    const isMatch = await verifyPassword(validated.password, user.passwordHash);
    if (!isMatch) {
      throw new AuthenticationError('Invalid email address or password');
    }

    await setSessionCookie(user._id.toString());
    logger.info(`User logged in successfully: ${user.email}`);

    return { user };
  }

  /**
   * Resolves Business ObjectId associated 1:1 with authenticated User identity.
   */
  async getBusinessIdForUser(userId: string | Types.ObjectId): Promise<Types.ObjectId> {
    await connectToDatabase();
    const uId = new Types.ObjectId(userId.toString());
    const business = await BusinessModel.findOne({ userId: uId }).exec();
    if (!business) {
      throw new AuthenticationError('User business profile not found');
    }
    return business._id as Types.ObjectId;
  }

  /**
   * Logs out user by clearing session cookie.
   */
  async logoutUser(): Promise<void> {
    await clearSessionCookie();
  }
}

export const authService = new AuthService();
