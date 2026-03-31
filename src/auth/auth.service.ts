import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../user/entities/user.entity';
import { Customer } from '../user/entities/customer.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { SellerProfile } from '../user/entities/seller-profile.entity';
import { Company } from '../company/entities/company.entity';
import { Store } from '../store/entities/store.entity';
import { UserRole, WalletType } from '../common/enums';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { ConfigService } from '@nestjs/config';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(SellerProfile)
    private readonly sellerProfileRepo: Repository<SellerProfile>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Register (customer self-registration) ─────────────────────
  async register(dto: RegisterDto) {
    // Check for duplicate phone
    const existingUser = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });
    if (existingUser) {
      throw new ConflictException('Phone already registered');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create User
      const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
      const user = queryRunner.manager.create(User, {
        phone: dto.phone,
        email: dto.email ?? null,
        password_hash: passwordHash,
        role: UserRole.CUSTOMER,
      });
      const savedUser = await queryRunner.manager.save(user);

      // 2. Create Customer
      const referralCode = this.generateReferralCode();
      const customer = queryRunner.manager.create(Customer, {
        user_id: savedUser.id,
        phone: dto.phone,
        email: dto.email ?? null,
        first_name: dto.first_name,
        last_name: dto.last_name,
        referral_code: referralCode,
      });
      const savedCustomer = await queryRunner.manager.save(customer);

      // 3. Create bonus wallet
      const wallet = queryRunner.manager.create(Wallet, {
        owner_type: 'customer',
        owner_id: savedCustomer.id,
        wallet_type: WalletType.BONUS,
        balance_cached: 0,
        currency: 'KZT',
      });
      await queryRunner.manager.save(wallet);

      await queryRunner.commitTransaction();

      // 4. Return JWT tokens
      const tokens = await this.generateTokens(savedUser);
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        user_id: savedUser.id,
        customer_id: savedCustomer.id,
        referral_code: referralCode,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── Login ─────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user_id: user.id,
      role: user.role,
    };
  }

  // ─── Refresh ───────────────────────────────────────────────────
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const user = await this.userRepo.findOne({ where: { id: payload.sub } });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────
  private async generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
    };

    // Enrich payload with hierarchy IDs based on role
    if (user.role === UserRole.SELLER) {
      const sellerProfile = await this.sellerProfileRepo.findOne({
        where: { user_id: user.id },
      });
      if (sellerProfile) {
        payload.store_id = sellerProfile.store_id;
        const store = await this.storeRepo.findOne({
          where: { id: sellerProfile.store_id },
        });
        if (store) {
          payload.company_id = store.company_id;
        }
      }
    } else if (user.role === UserRole.COMPANY_ADMIN) {
      const company = await this.companyRepo.findOne({
        where: {},
      });
      if (company) {
        payload.company_id = company.id;
      }
    }

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '24h' }),
      this.jwtService.signAsync(payload, { expiresIn: '30d' }),
    ]);

    return { access_token, refresh_token };
  }

  private generateReferralCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
