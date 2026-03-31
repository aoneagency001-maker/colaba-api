import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Customer } from './entities/customer.entity';
import { SellerProfile } from './entities/seller-profile.entity';
import { UserService } from './user.service';
import { UserController, CustomerController, SellerController } from './user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Customer, SellerProfile])],
  controllers: [UserController, CustomerController, SellerController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
