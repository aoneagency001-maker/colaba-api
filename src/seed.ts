import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { Company } from './company/entities/company.entity';
import { Store } from './store/entities/store.entity';
import { User } from './user/entities/user.entity';
import { Customer } from './user/entities/customer.entity';
import { SellerProfile } from './user/entities/seller-profile.entity';
import { Wallet } from './wallet/entities/wallet.entity';
import { Transaction } from './transaction/entities/transaction.entity';
import { LedgerEntry } from './transaction/entities/ledger-entry.entity';
import { BonusLot } from './bonus-lot/entities/bonus-lot.entity';
import { Notification } from './notification/entities/notification.entity';
import { AuditLog } from './audit/entities/audit-log.entity';
import { Category } from './catalog/entities/category.entity';
import { Product, BonusType } from './catalog/entities/product.entity';
import { Order, OrderStatus } from './order/entities/order.entity';
import { NewsArticle, NewsCategory } from './news/entities/news-article.entity';

import {
  UserRole,
  WalletType,
  TransactionType,
  TransactionStatus,
  LedgerEntryType,
  EntityStatus,
} from './common/enums';

// ─── helpers ──────────────────────────────────────────────────
function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'colaba_user',
    password: process.env.DB_PASSWORD ?? 'colaba2026',
    database: process.env.DB_DATABASE ?? 'colaba_db',
    entities: [
      Company, Store, User, Customer, SellerProfile,
      Wallet, Transaction, LedgerEntry, BonusLot,
      Notification, AuditLog,
      Category, Product, Order, NewsArticle,
    ],
    synchronize: true,
    logging: false,
  });

  await ds.initialize();
  console.log('Connected to database');

  // ─── clear tables in dependency order ───────────────────────
  const tables = [
    'news_articles', 'orders', 'products', 'categories',
    'notifications', 'audit_logs', 'bonus_lots',
    'ledger_entries', 'transactions', 'wallets',
    'seller_profiles', 'customers', 'users',
    'stores', 'companies',
  ];
  for (const t of tables) {
    await ds.query(`DELETE FROM "${t}" CASCADE`).catch(() => {});
  }
  console.log('Cleared existing data');

  const companyRepo = ds.getRepository(Company);
  const storeRepo = ds.getRepository(Store);
  const userRepo = ds.getRepository(User);
  const customerRepo = ds.getRepository(Customer);
  const sellerRepo = ds.getRepository(SellerProfile);
  const walletRepo = ds.getRepository(Wallet);
  const txRepo = ds.getRepository(Transaction);
  const ledgerRepo = ds.getRepository(LedgerEntry);
  const lotRepo = ds.getRepository(BonusLot);
  const notifRepo = ds.getRepository(Notification);
  const auditRepo = ds.getRepository(AuditLog);

  // ─── 1. Company ─────────────────────────────────────────────
  const company = await companyRepo.save(companyRepo.create({
    name: 'StalFed',
    description: 'Крупнейший поставщик металлопроката в Казахстане',
    phone: '+77084922088',
    email: 'zakaz@steelfed.kz',
    website: 'stalfed.kz',
    status: EntityStatus.ACTIVE,
  }));
  console.log('Company created:', company.id);

  // ─── 2. Stores ─────────────────────────────────────────────
  const storeAlmaty = await storeRepo.save(storeRepo.create({
    company_id: company.id,
    name: 'Склад Алматы',
    address: 'ул. Рыскулова 67/3',
    phone: '+77084922088',
    working_hours: 'Пн-Сб 8:00-18:00',
    status: EntityStatus.ACTIVE,
  }));
  const storeAstana = await storeRepo.save(storeRepo.create({
    company_id: company.id,
    name: 'Склад Астана',
    address: 'ул. Промышленная 15',
    phone: '+77084922089',
    working_hours: 'Пн-Сб 9:00-18:00',
    status: EntityStatus.ACTIVE,
  }));
  const storeOffice = await storeRepo.save(storeRepo.create({
    company_id: company.id,
    name: 'Офис продаж',
    address: 'ул. Абая 150, оф. 305',
    phone: '+77084922090',
    working_hours: 'Пн-Пт 9:00-18:00',
    status: EntityStatus.ACTIVE,
  }));
  console.log('Stores created:', [storeAlmaty.id, storeAstana.id, storeOffice.id]);

  // ─── 3. Password hashes ────────────────────────────────────
  const COST = 12;
  const [hashAdmin, hashCompany, hashSeller, hashCustomer] = await Promise.all([
    bcrypt.hash('admin123', COST),
    bcrypt.hash('company123', COST),
    bcrypt.hash('seller123', COST),
    bcrypt.hash('test123', COST),
  ]);

  // ─── 4. Staff users ────────────────────────────────────────
  const adminUser = await userRepo.save(userRepo.create({
    phone: '+77000000001',
    password_hash: hashAdmin,
    role: UserRole.ADMIN,
    status: EntityStatus.ACTIVE,
  }));

  const companyAdminUser = await userRepo.save(userRepo.create({
    phone: '+77084922088',
    password_hash: hashCompany,
    role: UserRole.COMPANY_ADMIN,
    status: EntityStatus.ACTIVE,
  }));

  const seller1User = await userRepo.save(userRepo.create({
    phone: '+77001111111',
    password_hash: hashSeller,
    role: UserRole.SELLER,
    status: EntityStatus.ACTIVE,
  }));
  const seller2User = await userRepo.save(userRepo.create({
    phone: '+77002222222',
    password_hash: hashSeller,
    role: UserRole.SELLER,
    status: EntityStatus.ACTIVE,
  }));

  // Seller profiles
  await sellerRepo.save(sellerRepo.create({
    user_id: seller1User.id,
    store_id: storeAlmaty.id,
    employee_code: 'ALM-001',
    status: EntityStatus.ACTIVE,
  }));
  await sellerRepo.save(sellerRepo.create({
    user_id: seller2User.id,
    store_id: storeAstana.id,
    employee_code: 'AST-001',
    status: EntityStatus.ACTIVE,
  }));
  console.log('Staff users created');

  // ─── 5. Customers ──────────────────────────────────────────
  const custData = [
    { first_name: 'Иван', last_name: 'Петров', phone: '+77001234567', ref: 'REF-PETROV', balance: 47500 },
    { first_name: 'Ерлан', last_name: 'Ахметов', phone: '+77012345678', ref: 'REF-AKHMETOV', balance: 12800 },
    { first_name: 'Анна', last_name: 'Смирнова', phone: '+77023456789', ref: 'REF-SMIRNOVA', balance: 83200 },
    { first_name: 'Дамир', last_name: 'Каримов', phone: '+77034567890', ref: 'REF-KARIMOV', balance: 5400 },
    { first_name: 'Асель', last_name: 'Нурланова', phone: '+77045678901', ref: 'REF-NURLANOVA', balance: 21000 },
  ];

  interface CustRecord {
    user: User;
    customer: Customer;
    wallet: Wallet;
    balance: number;
  }
  const customers: CustRecord[] = [];

  for (const c of custData) {
    const user = await userRepo.save(userRepo.create({
      phone: c.phone,
      password_hash: hashCustomer,
      role: UserRole.CUSTOMER,
      status: EntityStatus.ACTIVE,
    }));

    const customer = await customerRepo.save(customerRepo.create({
      user_id: user.id,
      phone: c.phone,
      first_name: c.first_name,
      last_name: c.last_name,
      referral_code: c.ref,
      status: EntityStatus.ACTIVE,
    }));

    const wallet = await walletRepo.save(walletRepo.create({
      owner_type: 'customer',
      owner_id: customer.id,
      wallet_type: WalletType.BONUS,
      balance_cached: c.balance,
      currency: 'KZT',
      status: EntityStatus.ACTIVE,
    }));

    customers.push({ user, customer, wallet, balance: c.balance });
  }
  console.log('Customers created:', customers.length);

  // ─── 6. Company deposit wallet ─────────────────────────────
  const depositWallet = await walletRepo.save(walletRepo.create({
    owner_type: 'company',
    owner_id: company.id,
    wallet_type: WalletType.DEPOSIT,
    balance_cached: 500000,
    currency: 'KZT',
    status: EntityStatus.ACTIVE,
  }));

  // ─── 7. System wallets ──────────────────────────────────────
  const systemId = uuidv4();
  const burnWallet = await walletRepo.save(walletRepo.create({
    owner_type: 'system',
    owner_id: systemId,
    wallet_type: WalletType.BURN,
    balance_cached: 15000,
    currency: 'KZT',
    status: EntityStatus.ACTIVE,
  }));
  const feeWallet = await walletRepo.save(walletRepo.create({
    owner_type: 'system',
    owner_id: systemId,
    wallet_type: WalletType.SYSTEM_FEE,
    balance_cached: 8500,
    currency: 'KZT',
    status: EntityStatus.ACTIVE,
  }));
  console.log('Wallets created (deposit, burn, fee)');

  // ─── 8. Transactions + ledger entries ───────────────────────

  async function createTx(
    type: TransactionType,
    amount: number,
    sourceWalletId: string,
    targetWalletId: string,
    description: string,
  ): Promise<Transaction> {
    const tx = await txRepo.save(txRepo.create({
      type,
      status: TransactionStatus.SETTLED,
      amount,
      currency: 'KZT',
      source_wallet_id: sourceWalletId,
      target_wallet_id: targetWalletId,
      idempotency_key: uuidv4(),
      description,
    }));

    await ledgerRepo.save([
      ledgerRepo.create({
        transaction_id: tx.id,
        wallet_id: sourceWalletId,
        entry_type: LedgerEntryType.DEBIT,
        amount,
      }),
      ledgerRepo.create({
        transaction_id: tx.id,
        wallet_id: targetWalletId,
        entry_type: LedgerEntryType.CREDIT,
        amount,
      }),
    ]);

    return tx;
  }

  // Accrual 18750 to customer 1
  const tx1 = await createTx(
    TransactionType.BONUS_ACCRUAL, 18750,
    depositWallet.id, customers[0].wallet.id,
    'Начисление бонусов за покупку арматуры А500 12мм',
  );

  // Accrual 25000 to customer 3
  const tx2 = await createTx(
    TransactionType.BONUS_ACCRUAL, 25000,
    depositWallet.id, customers[2].wallet.id,
    'Начисление бонусов за покупку труб профильных',
  );

  // Accrual 12800 to customer 2
  const tx3 = await createTx(
    TransactionType.BONUS_ACCRUAL, 12800,
    depositWallet.id, customers[1].wallet.id,
    'Начисление бонусов за покупку листового проката',
  );

  // Accrual 8400 to customer 4
  const tx4 = await createTx(
    TransactionType.BONUS_ACCRUAL, 8400,
    depositWallet.id, customers[3].wallet.id,
    'Начисление бонусов за покупку швеллера',
  );

  // Accrual 21000 to customer 5
  const tx5 = await createTx(
    TransactionType.BONUS_ACCRUAL, 21000,
    depositWallet.id, customers[4].wallet.id,
    'Начисление бонусов за покупку балки двутавровой',
  );

  // Spend 5000 from customer 1
  const tx6 = await createTx(
    TransactionType.BONUS_SPEND, 5000,
    customers[0].wallet.id, depositWallet.id,
    'Списание бонусов при покупке уголка 63х63',
  );

  // Burn 3000 expired from customer 4
  const tx7 = await createTx(
    TransactionType.BURN, 3000,
    customers[3].wallet.id, burnWallet.id,
    'Сгорание просроченных бонусов',
  );

  console.log('Transactions created:', 7);

  // ─── 9. Bonus lots ─────────────────────────────────────────
  const lotData: Array<{
    walletId: string;
    txId: string;
    amount: number;
    expDays: number;
  }> = [
    // Customer 1: balance 47500
    { walletId: customers[0].wallet.id, txId: tx1.id, amount: 13750, expDays: 30 },
    { walletId: customers[0].wallet.id, txId: tx1.id, amount: 33750, expDays: 300 },
    // Customer 2: balance 12800
    { walletId: customers[1].wallet.id, txId: tx3.id, amount: 5000, expDays: 45 },
    { walletId: customers[1].wallet.id, txId: tx3.id, amount: 7800, expDays: 280 },
    // Customer 3: balance 83200
    { walletId: customers[2].wallet.id, txId: tx2.id, amount: 25000, expDays: 60 },
    { walletId: customers[2].wallet.id, txId: tx2.id, amount: 33200, expDays: 300 },
    { walletId: customers[2].wallet.id, txId: tx2.id, amount: 25000, expDays: 200 },
    // Customer 4: balance 5400
    { walletId: customers[3].wallet.id, txId: tx4.id, amount: 5400, expDays: 250 },
    // Customer 5: balance 21000
    { walletId: customers[4].wallet.id, txId: tx5.id, amount: 11000, expDays: 30 },
    { walletId: customers[4].wallet.id, txId: tx5.id, amount: 10000, expDays: 300 },
  ];

  for (const lot of lotData) {
    await lotRepo.save(lotRepo.create({
      customer_wallet_id: lot.walletId,
      source_transaction_id: lot.txId,
      amount_remaining: lot.amount,
      expires_at: daysFromNow(lot.expDays),
    }));
  }
  console.log('Bonus lots created:', lotData.length);

  // ─── 10. Notifications ─────────────────────────────────────
  await notifRepo.save([
    notifRepo.create({
      user_id: customers[0].user.id,
      type: 'bonus_accrual',
      title: 'Начислены бонусы',
      body: 'Вам начислено 18 750 ₸ бонусов за покупку арматуры А500 12мм',
      related_transaction_id: tx1.id,
      is_read: true,
    }),
    notifRepo.create({
      user_id: customers[0].user.id,
      type: 'bonus_spend',
      title: 'Списаны бонусы',
      body: 'Списано 5 000 ₸ бонусов при покупке уголка 63х63',
      related_transaction_id: tx6.id,
      is_read: false,
    }),
    notifRepo.create({
      user_id: customers[0].user.id,
      type: 'bonus_expiring',
      title: 'Бонусы скоро сгорят',
      body: '13 750 ₸ бонусов сгорят через 30 дней. Успейте потратить!',
      is_read: false,
    }),
  ]);
  console.log('Notifications created: 3');

  // ─── 11. Audit logs ────────────────────────────────────────
  await auditRepo.save([
    auditRepo.create({
      actor_user_id: companyAdminUser.id,
      entity_type: 'company',
      entity_id: company.id,
      action: 'company.created',
      meta_json: { name: 'StalFed' },
    }),
    auditRepo.create({
      actor_user_id: seller1User.id,
      entity_type: 'transaction',
      entity_id: tx1.id,
      action: 'bonus.accrued',
      meta_json: { amount: 18750, customer_phone: '+77001234567' },
    }),
  ]);
  console.log('Audit logs created: 2');

  // ─── 12. Categories ────────────────────────────────────────
  const catRepo2 = ds.getRepository(Category);
  const prodRepo2 = ds.getRepository(Product);
  const orderRepo2 = ds.getRepository(Order);
  const newsRepo2 = ds.getRepository(NewsArticle);

  const daysAgo = (d: number) => { const dt = new Date(); dt.setDate(dt.getDate() - d); return dt; };
  const expiresIn = (d: number) => { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt; };

  const mainCats = [
    { name: 'Сортовой прокат', slug: 'sortovoy-prokat', sortOrder: 1 },
    { name: 'Листовой прокат', slug: 'listovoy-prokat', sortOrder: 2 },
    { name: 'Трубный прокат', slug: 'trubnyy-prokat', sortOrder: 3 },
    { name: 'Фасонный прокат', slug: 'fasonnyy-prokat', sortOrder: 4 },
    { name: 'Нержавеющий прокат', slug: 'nerzhaveyushiy-prokat', sortOrder: 5 },
    { name: 'Трубопроводная арматура', slug: 'truboprovodnaya-armatura', sortOrder: 6 },
    { name: 'Метизы', slug: 'metizy', sortOrder: 7 },
    { name: 'Сэндвич-панели', slug: 'sendvich-paneli', sortOrder: 8 },
  ];

  const savedCats: Record<string, Category> = {};
  for (const c of mainCats) {
    const e = await catRepo2.save(catRepo2.create(c));
    savedCats[c.slug] = e;
  }
  console.log('Main categories created:', mainCats.length);

  const subCats = [
    { name: 'Арматура', slug: 'armatura', p: 'sortovoy-prokat' },
    { name: 'Катанка / Круг', slug: 'katanka-krug', p: 'sortovoy-prokat' },
    { name: 'Квадрат', slug: 'kvadrat', p: 'sortovoy-prokat' },
    { name: 'Полоса стальная', slug: 'polosa', p: 'sortovoy-prokat' },
    { name: 'Шестигранник', slug: 'shestigrannik', p: 'sortovoy-prokat' },
    { name: 'Лист горячекатаный', slug: 'list-gk', p: 'listovoy-prokat' },
    { name: 'Лист холоднокатаный', slug: 'list-hk', p: 'listovoy-prokat' },
    { name: 'Лист рифлёный', slug: 'list-rifl', p: 'listovoy-prokat' },
    { name: 'Лист оцинкованный', slug: 'list-ocink', p: 'listovoy-prokat' },
    { name: 'Лист нержавеющий', slug: 'list-nerzh', p: 'listovoy-prokat' },
    { name: 'Профнастил', slug: 'profnastil', p: 'listovoy-prokat' },
    { name: 'Лист ПВЛ', slug: 'list-pvl', p: 'listovoy-prokat' },
    { name: 'Труба профильная', slug: 'truba-prof', p: 'trubnyy-prokat' },
    { name: 'Труба ВГП', slug: 'truba-vgp', p: 'trubnyy-prokat' },
    { name: 'Труба электросварная', slug: 'truba-esv', p: 'trubnyy-prokat' },
    { name: 'Труба бесшовная', slug: 'truba-bsh', p: 'trubnyy-prokat' },
    { name: 'Труба НКТ', slug: 'truba-nkt', p: 'trubnyy-prokat' },
    { name: 'Балка двутавровая', slug: 'balka', p: 'fasonnyy-prokat' },
    { name: 'Швеллер', slug: 'shveller', p: 'fasonnyy-prokat' },
    { name: 'Уголок равнополочный', slug: 'ugolok-ravn', p: 'fasonnyy-prokat' },
    { name: 'Уголок неравнополочный', slug: 'ugolok-nerav', p: 'fasonnyy-prokat' },
    { name: 'Лист нержавеющий', slug: 'nerzh-list', p: 'nerzhaveyushiy-prokat' },
    { name: 'Труба нержавеющая', slug: 'nerzh-truba', p: 'nerzhaveyushiy-prokat' },
    { name: 'Уголок нержавеющий', slug: 'nerzh-ugolok', p: 'nerzhaveyushiy-prokat' },
    { name: 'Отвод 90°', slug: 'otvod-90', p: 'truboprovodnaya-armatura' },
    { name: 'Тройник', slug: 'troynik', p: 'truboprovodnaya-armatura' },
    { name: 'Переход', slug: 'perehod', p: 'truboprovodnaya-armatura' },
    { name: 'Проволока', slug: 'provoloka', p: 'metizy' },
    { name: 'Сетка', slug: 'setka', p: 'metizy' },
    { name: 'Электроды', slug: 'elektrody', p: 'metizy' },
  ];

  const savedSubs: Record<string, Category> = {};
  for (const s of subCats) {
    const e = await catRepo2.save(catRepo2.create({ name: s.name, slug: s.slug, parentId: savedCats[s.p].id }));
    savedSubs[s.slug] = e;
  }
  console.log('Subcategories created:', subCats.length);

  // ─── 13. Products (loaded from xlsx data) ──────────────────
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const seedProducts: Array<{ name: string; description: string; price: number; unit: string; cat: string; bonus: number; image: string }> =
    JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'seed-products.json'), 'utf-8'));

  let prodCount = 0;
  for (const p of seedProducts) {
    const cat = savedSubs[p.cat] || savedCats[p.cat];
    if (!cat) { continue; }
    await prodRepo2.save(prodRepo2.create({
      name: p.name.trim(),
      description: p.price > 0 ? p.description : `${p.description}\n\nЦена по запросу`,
      price: p.price,
      unit: p.unit,
      categoryId: cat.id,
      bonusType: BonusType.PERCENT,
      bonusValue: p.bonus,
      bonusMultiplier: 1,
      images: [p.image],
    }));
    prodCount++;
  }
  console.log('Products created:', prodCount);

  // ─── 14. Orders for customer 1 ─────────────────────────────
  const cust1User = customers[0].user;

  const o1 = await orderRepo2.save(orderRepo2.create({
    userId: cust1User.id, totalAmount: 625000, bonusDiscount: 0,
    finalAmount: 625000, totalBonusEarned: 18750, status: OrderStatus.CONFIRMED,
    items: [{ productId: '', productName: 'Арматура А500С d12', quantity: 5, price: 125000, unit: 'тонна', bonusEarned: 18750 }],
    created_at: daysAgo(45),
  }));

  const o2 = await orderRepo2.save(orderRepo2.create({
    userId: cust1User.id, totalAmount: 425000, bonusDiscount: 5000,
    finalAmount: 420000, totalBonusEarned: 18250, status: OrderStatus.CONFIRMED,
    items: [
      { productId: '', productName: 'Лист г/к 3мм', quantity: 2, price: 148000, unit: 'тонна', bonusEarned: 11600 },
      { productId: '', productName: 'Отвод 90° 108x6', quantity: 10, price: 2500, unit: 'шт', bonusEarned: 1250 },
    ],
    created_at: daysAgo(20),
  }));

  const o3 = await orderRepo2.save(orderRepo2.create({
    userId: cust1User.id, totalAmount: 510000, bonusDiscount: 0,
    finalAmount: 510000, totalBonusEarned: 25500, status: OrderStatus.CONFIRMED,
    items: [{ productId: '', productName: 'Профтруба 40x40x2', quantity: 3, price: 170000, unit: 'тонна', bonusEarned: 25500 }],
    created_at: daysAgo(5),
  }));

  const o4 = await orderRepo2.save(orderRepo2.create({
    userId: cust1User.id, totalAmount: 316000, bonusDiscount: 0,
    finalAmount: 316000, totalBonusEarned: 15800, status: OrderStatus.PENDING,
    items: [{ productId: '', productName: 'Швеллер 12П', quantity: 2, price: 158000, unit: 'тонна', bonusEarned: 15800 }],
  }));
  console.log('Orders created: 4');

  // ─── 15. News ──────────────────────────────────────────────
  await newsRepo2.save([
    newsRepo2.create({
      title: 'Двойной кэшбэк на профильную трубу!',
      content: 'С 1 по 30 апреля 2026 года — акция «Двойной кэшбэк» на всю профильную трубу.\n\nВместо стандартных 5% получайте 10% кэшбэка. Действует на все размеры.\n\nУсловия:\n- Автоматическое начисление при подтверждении заказа\n- Бонусы действуют 12 месяцев\n- Используйте при следующих покупках',
      category: NewsCategory.PROMO, isPublished: true, publishedAt: daysAgo(2),
    }),
    newsRepo2.create({
      title: 'Поступление арматуры А500С',
      content: 'На склад в Алматы поступила крупная партия арматуры А500С: d8-d40.\n\nОбъём — более 500 тонн. Сертификаты качества.\nПроизводитель: АрселорМиттал Темиртау\n\nЗаказывайте и получайте кэшбэк 3%!',
      category: NewsCategory.UPDATE, isPublished: true, publishedAt: daysAgo(5),
    }),
    newsRepo2.create({
      title: 'Новый крытый склад 2000 м2',
      content: 'StalFed открыл новый склад в промзоне Алматы.\n\n- +30% ассортимента на складе\n- Идеальное хранение листового проката\n- Отгрузка за 2 часа\n\nАдрес: Алматы, ул. Рыскулова 67/3\nГрафик: Пн-Сб, 8:00-18:00',
      category: NewsCategory.EVENT, isPublished: true, publishedAt: daysAgo(12),
    }),
    newsRepo2.create({
      title: 'Плазменная и газовая резка',
      content: 'Услуги резки металла:\n- Плазменная — до 50мм, точность +-1мм\n- Газовая — до 200мм\n- Гильотинная — лист до 6мм\n\nСроки: 1-3 дня. Кэшбэк 5% на услуги резки!',
      category: NewsCategory.UPDATE, isPublished: true, publishedAt: daysAgo(18),
    }),
    newsRepo2.create({
      title: 'С Наурызом!',
      content: 'Команда StalFed поздравляет с праздником Наурыз!\n\nГрафик:\n- 21-23 марта — выходные\n- 24 марта — обычный режим\n\nПраздничный бонус +500 тг к заказам 18-24 марта!',
      category: NewsCategory.EVENT, isPublished: true, publishedAt: daysAgo(8),
    }),
  ]);
  console.log('News created: 5');

  // ─── Done ──────────────────────────────────────────────────
  await ds.destroy();
  console.log('\nSeed completed successfully!');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
