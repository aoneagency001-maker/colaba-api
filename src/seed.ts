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

  // ─── 13. Products — hardcoded StalFed catalog with real prices ──
  const B = 'http://colaba.5.35.107.85.nip.io/images';
  const imageForCat: Record<string, string> = {
    'armatura': `${B}/catalog_stal-armaturnaya-a-iii.png`,
    'katanka-krug': `${B}/sortovoy_katanka.jpg`,
    'kvadrat': `${B}/sortovoy_kvadrat.jpg`,
    'polosa': `${B}/sortovoy_polosa.png`,
    'shestigrannik': `${B}/catalog_shestigrannik.png`,
    'list-gk': `${B}/catalog_list-goryachekatanyj-s-rifleniem.png`,
    'list-hk': `${B}/cat_list_hk2.png`,
    'list-rifl': `${B}/cat_list_rifl_real.png`,
    'list-ocink': `${B}/catalog_proflist-ocinkovannyj.png`,
    'profnastil': `${B}/catalog_profnastil-ns21.jpg`,
    'list-pvl': `${B}/catalog_list-prosechno-vytyazhnoj-pvl.png`,
    'list-nerzh': `${B}/cat_nerzh_list2.png`,
    'truba-prof': `${B}/catalog_cataloque_aljuminievajaprofilnajatruba.jpg`,
    'truba-vgp': `${B}/cat_truba_vgp2.png`,
    'truba-esv': `${B}/cat_truba_esv.jpg`,
    'truba-bsh': `${B}/cat_truba_bsh2.png`,
    'truba-nkt': `${B}/cat_truba_nkt.jpg`,
    'balka': `${B}/catalog_balka-dvutavrovaya.png`,
    'shveller': `${B}/cat_shveller.png`,
    'ugolok-ravn': `${B}/cat_ugolok_ravn.jpg`,
    'ugolok-nerav': `${B}/catalog_ugolok-neravnopolochnyj.png`,
    'nerzh-list': `${B}/cat_nerzh_list2.png`,
    'nerzh-truba': `${B}/catalog_truba-aisi201.png`,
    'nerzh-ugolok': `${B}/catalog_ugolok-nerzhaveyushchij.png`,
    'provoloka': `${B}/cat_provoloka2.jpg`,
    'setka': `${B}/catalog_setka-stalnaya-pletyonaya-odinarnaya-rabica.png`,
    'elektrody': `${B}/catalog_ehlektrody.png`,
    'otvod-90': `${B}/catalog_poluotvod-30.png`,
    'troynik': `${B}/cat_troynik2.jpg`,
    'perehod': `${B}/cat_krestovina2.jpeg`,
  };

  const products: { name: string; desc: string; price: number; unit: string; cat: string; bonus: number; comp?: string; mult?: number }[] = [
    // ─── Арматура (ГОСТ 5781-82) ───
    { name: 'Арматура А500С d8', desc: 'Арматура горячекатаная класса А-III (А500С), d8мм, ГОСТ 5781-82', price: 135000, unit: 'тонна', cat: 'armatura', bonus: 3, comp: '35ГС' },
    { name: 'Арматура А500С d10', desc: 'Арматура горячекатаная класса А-III (А500С), d10мм, ГОСТ 5781-82', price: 128000, unit: 'тонна', cat: 'armatura', bonus: 3, comp: '35ГС, А500' },
    { name: 'Арматура А500С d12', desc: 'Арматура горячекатаная класса А-III (А500С), d12мм, ГОСТ 5781-82. Длина 11.7м', price: 125000, unit: 'тонна', cat: 'armatura', bonus: 3, comp: 'А500' },
    { name: 'Арматура А500С d14', desc: 'Арматура класса А-III (А500С), d14мм, ГОСТ 5781-82', price: 126000, unit: 'тонна', cat: 'armatura', bonus: 3, comp: 'А500' },
    { name: 'Арматура А500С d16', desc: 'Арматура класса А-III (А500С), d16мм, ГОСТ 5781-82', price: 125000, unit: 'тонна', cat: 'armatura', bonus: 3, comp: 'А500' },
    { name: 'Арматура А500С d18', desc: 'Арматура класса А-III (А500С), d18мм, ГОСТ 5781-82', price: 127000, unit: 'тонна', cat: 'armatura', bonus: 3, comp: 'А500' },
    { name: 'Арматура А500С d20', desc: 'Арматура класса А-III (А500С), d20мм, ГОСТ 5781-82', price: 126000, unit: 'тонна', cat: 'armatura', bonus: 3, comp: 'А500' },
    { name: 'Арматура А500С d22', desc: 'Арматура класса А-III (А500С), d22мм, ГОСТ 5781-82', price: 128000, unit: 'тонна', cat: 'armatura', bonus: 3, comp: 'А500' },
    { name: 'Арматура А500С d25', desc: 'Арматура класса А-III (А500С), d25мм, ГОСТ 5781-82', price: 130000, unit: 'тонна', cat: 'armatura', bonus: 3, comp: 'А500' },
    { name: 'Арматура А500С d28', desc: 'Арматура класса А-III (А500С), d28мм, ГОСТ 5781-82', price: 132000, unit: 'тонна', cat: 'armatura', bonus: 3, comp: 'А500' },
    { name: 'Арматура А500С d32', desc: 'Арматура класса А-III (А500С), d32мм, ГОСТ 5781-82', price: 134000, unit: 'тонна', cat: 'armatura', bonus: 3, comp: 'А500' },
    { name: 'Арматура А500С d36', desc: 'Арматура класса А-III (А500С), d36мм, ГОСТ 5781-82', price: 138000, unit: 'тонна', cat: 'armatura', bonus: 3, comp: 'А500' },
    { name: 'Арматура А500С d40', desc: 'Арматура класса А-III (А500С), d40мм, ГОСТ 5781-82', price: 142000, unit: 'тонна', cat: 'armatura', bonus: 3, comp: 'А500' },

    // ─── Катанка/Круг ───
    { name: 'Катанка 6мм', desc: 'Катанка стальная d6мм, ГОСТ 30136-95', price: 120000, unit: 'тонна', cat: 'katanka-krug', bonus: 3, comp: 'Ст1-3кп/пс' },
    { name: 'Катанка 8мм', desc: 'Катанка стальная d8мм, ГОСТ 30136-95', price: 118000, unit: 'тонна', cat: 'katanka-krug', bonus: 3, comp: 'Ст1-3кп/пс' },
    { name: 'Круг стальной d12', desc: 'Круг горячекатаный d12мм, ГОСТ 2590-2006', price: 132000, unit: 'тонна', cat: 'katanka-krug', bonus: 3, comp: 'Ст3, Ст20' },
    { name: 'Круг стальной d20', desc: 'Круг горячекатаный d20мм, ГОСТ 2590-2006', price: 135000, unit: 'тонна', cat: 'katanka-krug', bonus: 3, comp: 'Ст3, Ст20' },

    // ─── Лист горячекатаный (ГОСТ 19903-2015) ───
    { name: 'Лист г/к 2мм 1250x2500', desc: 'Лист горячекатаный, 2мм, 1250x2500мм, ГОСТ 19903-2015', price: 152000, unit: 'тонна', cat: 'list-gk', bonus: 4, comp: 'Ст3сп' },
    { name: 'Лист г/к 3мм 1250x2500', desc: 'Лист горячекатаный, 3мм, 1250x2500мм, ГОСТ 19903-2015', price: 148000, unit: 'тонна', cat: 'list-gk', bonus: 4, comp: 'Ст3сп' },
    { name: 'Лист г/к 4мм 1500x6000', desc: 'Лист горячекатаный, 4мм, 1500x6000мм, ГОСТ 19903-2015', price: 145000, unit: 'тонна', cat: 'list-gk', bonus: 4, comp: 'Ст3сп/09Г2С' },
    { name: 'Лист г/к 5мм 1500x6000', desc: 'Лист горячекатаный, 5мм, 1500x6000мм, ГОСТ 19903-2015', price: 143000, unit: 'тонна', cat: 'list-gk', bonus: 4, comp: 'Ст3сп/09Г2С' },
    { name: 'Лист г/к 6мм 1500x6000', desc: 'Лист горячекатаный, 6мм, 1500x6000мм, ГОСТ 19903-2015', price: 142000, unit: 'тонна', cat: 'list-gk', bonus: 4, comp: 'Ст3сп' },
    { name: 'Лист г/к 8мм 1500x6000', desc: 'Лист горячекатаный, 8мм, 1500x6000мм, ГОСТ 19903-2015', price: 140000, unit: 'тонна', cat: 'list-gk', bonus: 4, comp: 'Ст3сп/09Г2С' },
    { name: 'Лист г/к 10мм 1500x6000', desc: 'Лист горячекатаный, 10мм, 1500x6000мм, ГОСТ 19903-2015', price: 139000, unit: 'тонна', cat: 'list-gk', bonus: 4, comp: 'Ст3сп' },
    { name: 'Лист г/к 12мм 1500x6000', desc: 'Лист горячекатаный, 12мм, 1500x6000мм, ГОСТ 19903-2015', price: 138000, unit: 'тонна', cat: 'list-gk', bonus: 4, comp: 'Ст3сп/09Г2С' },
    { name: 'Лист г/к 16мм 1500x6000', desc: 'Лист горячекатаный, 16мм, 1500x6000мм, ГОСТ 19903-2015', price: 140000, unit: 'тонна', cat: 'list-gk', bonus: 4, comp: '09Г2С' },
    { name: 'Лист г/к 20мм 1500x6000', desc: 'Лист горячекатаный, 20мм, 1500x6000мм, ГОСТ 19903-2015', price: 142000, unit: 'тонна', cat: 'list-gk', bonus: 4, comp: '09Г2С' },
    { name: 'Лист рифлёный 4мм', desc: 'Лист стальной рифлёный (чечевица), 4мм, ГОСТ 8568-77', price: 158000, unit: 'тонна', cat: 'list-rifl', bonus: 4, comp: 'Ст3сп' },
    { name: 'Лист оцинкованный 0.5мм', desc: 'Лист оцинкованный 0.5мм, 1250x2500, ГОСТ 14918-80', price: 195000, unit: 'тонна', cat: 'list-ocink', bonus: 4 },
    { name: 'Лист х/к 1мм 1250x2500', desc: 'Лист холоднокатаный 1мм, 1250x2500, ГОСТ 19904-90', price: 178000, unit: 'тонна', cat: 'list-hk', bonus: 4, comp: 'Ст08пс' },
    { name: 'Профнастил С8 окрашенный', desc: 'Профнастил С8-1150, окрашенный RAL, толщина 0.5мм', price: 2800, unit: 'м.п.', cat: 'profnastil', bonus: 4 },
    { name: 'Профнастил С21 оцинк.', desc: 'Профнастил С21-1000 оцинкованный, толщина 0.5мм', price: 2400, unit: 'м.п.', cat: 'profnastil', bonus: 4 },

    // ─── Труба профильная (ГОСТ 8639/8645) ───
    { name: 'Профтруба 20x20x1.5', desc: 'Труба профильная квадратная 20x20x1.5мм, ГОСТ 8639-82', price: 185000, unit: 'тонна', cat: 'truba-prof', bonus: 5, comp: 'Ст3/Ст20' },
    { name: 'Профтруба 40x20x2', desc: 'Труба профильная прямоугольная 40x20x2мм, ГОСТ 8645-68', price: 172000, unit: 'тонна', cat: 'truba-prof', bonus: 5, comp: 'Ст3/Ст20' },
    { name: 'Профтруба 40x40x2', desc: 'Труба профильная квадратная 40x40x2мм, ГОСТ 8639-82', price: 170000, unit: 'тонна', cat: 'truba-prof', bonus: 5, comp: 'Ст3/Ст20' },
    { name: 'Профтруба 60x40x3', desc: 'Труба профильная прямоугольная 60x40x3мм, ГОСТ 8645-68', price: 168000, unit: 'тонна', cat: 'truba-prof', bonus: 5, comp: 'Ст3/09Г2С' },
    { name: 'Профтруба 80x40x3', desc: 'Труба профильная прямоугольная 80x40x3мм, ГОСТ 8645-68', price: 172000, unit: 'тонна', cat: 'truba-prof', bonus: 5 },
    { name: 'Профтруба 80x80x4', desc: 'Труба профильная квадратная 80x80x4мм, ГОСТ 8639-82', price: 175000, unit: 'тонна', cat: 'truba-prof', bonus: 5 },
    { name: 'Профтруба 100x100x4', desc: 'Труба профильная квадратная 100x100x4мм, ГОСТ 8639-82', price: 178000, unit: 'тонна', cat: 'truba-prof', bonus: 5 },
    { name: 'Профтруба 40x20x2 (АКЦИЯ x2)', desc: 'АКЦИЯ: двойной кэшбэк! Труба профильная 40x20x2мм', price: 172000, unit: 'тонна', cat: 'truba-prof', bonus: 5, mult: 2 },

    // ─── Труба ВГП (ГОСТ 3262-75) ───
    { name: 'Труба ВГП 15x2.8', desc: 'Труба водогазопроводная 15x2.8мм, ГОСТ 3262-75', price: 195000, unit: 'тонна', cat: 'truba-vgp', bonus: 5 },
    { name: 'Труба ВГП 20x2.8', desc: 'Труба водогазопроводная 20x2.8мм, ГОСТ 3262-75', price: 190000, unit: 'тонна', cat: 'truba-vgp', bonus: 5 },
    { name: 'Труба ВГП 25x3.2', desc: 'Труба водогазопроводная 25x3.2мм, ГОСТ 3262-75', price: 185000, unit: 'тонна', cat: 'truba-vgp', bonus: 5 },
    { name: 'Труба ВГП 32x3.2', desc: 'Труба водогазопроводная 32x3.2мм, ГОСТ 3262-75', price: 183000, unit: 'тонна', cat: 'truba-vgp', bonus: 5 },
    { name: 'Труба ВГП 40x3.5', desc: 'Труба водогазопроводная 40x3.5мм, ГОСТ 3262-75', price: 182000, unit: 'тонна', cat: 'truba-vgp', bonus: 5 },
    { name: 'Труба ВГП 50x3.5', desc: 'Труба водогазопроводная 50x3.5мм, ГОСТ 3262-75', price: 180000, unit: 'тонна', cat: 'truba-vgp', bonus: 5 },

    // ─── Труба бесшовная (ГОСТ 8732-78) ───
    { name: 'Труба бесшовная 57x5', desc: 'Труба стальная бесшовная 57x5мм, ГОСТ 8732-78', price: 215000, unit: 'тонна', cat: 'truba-bsh', bonus: 5, comp: 'Ст20/09Г2С' },
    { name: 'Труба бесшовная 76x6', desc: 'Труба стальная бесшовная 76x6мм, ГОСТ 8732-78', price: 220000, unit: 'тонна', cat: 'truba-bsh', bonus: 5, comp: 'Ст20' },
    { name: 'Труба бесшовная 89x6', desc: 'Труба стальная бесшовная 89x6мм, ГОСТ 8732-78', price: 218000, unit: 'тонна', cat: 'truba-bsh', bonus: 5, comp: 'Ст20' },
    { name: 'Труба бесшовная 108x8', desc: 'Труба стальная бесшовная 108x8мм, ГОСТ 8732-78', price: 225000, unit: 'тонна', cat: 'truba-bsh', bonus: 5, comp: 'Ст20/09Г2С' },

    // ─── Балка двутавровая (ГОСТ 26020-83) ───
    { name: 'Балка 10Б1', desc: 'Балка двутавровая 10Б1, ГОСТ 26020-83, длина 12м', price: 168000, unit: 'тонна', cat: 'balka', bonus: 5, comp: 'Ст3сп' },
    { name: 'Балка 20Б1', desc: 'Балка двутавровая 20Б1, ГОСТ 26020-83, длина 12м', price: 162000, unit: 'тонна', cat: 'balka', bonus: 5, comp: 'Ст3сп' },
    { name: 'Балка 25Б1', desc: 'Балка двутавровая 25Б1, ГОСТ 26020-83, длина 12м', price: 163000, unit: 'тонна', cat: 'balka', bonus: 5, comp: 'Ст3сп/09Г2С' },
    { name: 'Балка 30Б1', desc: 'Балка двутавровая 30Б1, ГОСТ 26020-83, длина 12м', price: 165000, unit: 'тонна', cat: 'balka', bonus: 5, comp: 'Ст3сп/09Г2С' },

    // ─── Швеллер (ГОСТ 8240-97) ───
    { name: 'Швеллер 8П', desc: 'Швеллер стальной горячекатаный 8П, ГОСТ 8240-97', price: 165000, unit: 'тонна', cat: 'shveller', bonus: 5, comp: 'Ст3сп' },
    { name: 'Швеллер 10П', desc: 'Швеллер стальной горячекатаный 10П, ГОСТ 8240-97', price: 162000, unit: 'тонна', cat: 'shveller', bonus: 5, comp: 'Ст3сп' },
    { name: 'Швеллер 12П', desc: 'Швеллер стальной горячекатаный 12П, ГОСТ 8240-97, длина 12м', price: 158000, unit: 'тонна', cat: 'shveller', bonus: 5, comp: 'Ст3сп' },
    { name: 'Швеллер 14П', desc: 'Швеллер стальной горячекатаный 14П, ГОСТ 8240-97', price: 157000, unit: 'тонна', cat: 'shveller', bonus: 5, comp: 'Ст3сп' },
    { name: 'Швеллер 16П', desc: 'Швеллер стальной горячекатаный 16П, ГОСТ 8240-97', price: 156000, unit: 'тонна', cat: 'shveller', bonus: 5, comp: 'Ст3сп' },

    // ─── Уголок (ГОСТ 8509-93) ───
    { name: 'Уголок 25x25x3', desc: 'Уголок стальной равнополочный 25x25x3мм, ГОСТ 8509-93', price: 158000, unit: 'тонна', cat: 'ugolok-ravn', bonus: 5, comp: 'Ст3сп' },
    { name: 'Уголок 32x32x3', desc: 'Уголок стальной равнополочный 32x32x3мм, ГОСТ 8509-93', price: 155000, unit: 'тонна', cat: 'ugolok-ravn', bonus: 5, comp: 'Ст3сп' },
    { name: 'Уголок 40x40x4', desc: 'Уголок стальной равнополочный 40x40x4мм, ГОСТ 8509-93', price: 152000, unit: 'тонна', cat: 'ugolok-ravn', bonus: 5, comp: 'Ст3сп' },
    { name: 'Уголок 50x50x5', desc: 'Уголок стальной равнополочный 50x50x5мм, ГОСТ 8509-93', price: 150000, unit: 'тонна', cat: 'ugolok-ravn', bonus: 5, comp: 'Ст3сп' },
    { name: 'Уголок 63x63x6', desc: 'Уголок стальной равнополочный 63x63x6мм, ГОСТ 8509-93', price: 148000, unit: 'тонна', cat: 'ugolok-ravn', bonus: 5, comp: 'Ст3сп' },
    { name: 'Уголок 75x75x6', desc: 'Уголок стальной равнополочный 75x75x6мм, ГОСТ 8509-93', price: 147000, unit: 'тонна', cat: 'ugolok-ravn', bonus: 5, comp: 'Ст3сп' },

    // ─── Метизы ───
    { name: 'Проволока вязальная 1.2мм', desc: 'Проволока стальная вязальная d1.2мм, ГОСТ 3282-74', price: 145000, unit: 'тонна', cat: 'provoloka', bonus: 3 },
    { name: 'Проволока вязальная 3мм', desc: 'Проволока стальная вязальная d3мм, ГОСТ 3282-74', price: 140000, unit: 'тонна', cat: 'provoloka', bonus: 3 },
    { name: 'Сетка рабица 50x50 d1.6', desc: 'Сетка стальная плетёная одинарная «Рабица» 50x50мм, d1.6мм, рулон 1.5x10м', price: 5500, unit: 'рулон', cat: 'setka', bonus: 3 },
    { name: 'Сетка сварная 50x50 d3', desc: 'Сетка стальная сварная 50x50мм, d3мм, карта 1x2м', price: 1200, unit: 'карта', cat: 'setka', bonus: 3 },
    { name: 'Электроды МР-3 d3', desc: 'Электроды сварочные МР-3, d3мм, ГОСТ 9466-75, пачка 5кг', price: 2500, unit: 'пачка', cat: 'elektrody', bonus: 3 },
    { name: 'Электроды УОНИ 13/55 d4', desc: 'Электроды сварочные УОНИ 13/55, d4мм, пачка 5кг', price: 3200, unit: 'пачка', cat: 'elektrody', bonus: 3 },

    // ─── Трубопроводная арматура ───
    { name: 'Отвод 90° 57x3.5', desc: 'Отвод стальной крутоизогнутый 90° 57x3.5мм, ГОСТ 17375-2001', price: 850, unit: 'штука', cat: 'otvod-90', bonus: 5 },
    { name: 'Отвод 90° 89x5', desc: 'Отвод стальной крутоизогнутый 90° 89x5мм, ГОСТ 17375-2001', price: 1800, unit: 'штука', cat: 'otvod-90', bonus: 5 },
    { name: 'Отвод 90° 108x6', desc: 'Отвод стальной крутоизогнутый 90° 108x6мм, ГОСТ 17375-2001', price: 2500, unit: 'штука', cat: 'otvod-90', bonus: 5 },
    { name: 'Тройник 57x3.5', desc: 'Тройник стальной равнопроходной 57x3.5мм, ГОСТ 17376-2001', price: 1200, unit: 'штука', cat: 'troynik', bonus: 5 },
    { name: 'Тройник 89x5', desc: 'Тройник стальной равнопроходной 89x5мм, ГОСТ 17376-2001', price: 2800, unit: 'штука', cat: 'troynik', bonus: 5 },
  ];

  let prodCount = 0;
  for (const p of products) {
    const cat = savedSubs[p.cat] || savedCats[p.cat];
    if (!cat) { continue; }
    const img = imageForCat[p.cat] || 'http://colaba.5.35.107.85.nip.io/images/catalog_default.png';
    await prodRepo2.save(prodRepo2.create({
      name: p.name,
      description: p.desc,
      price: p.price,
      unit: p.unit,
      categoryId: cat.id,
      bonusType: BonusType.PERCENT,
      bonusValue: p.bonus,
      bonusMultiplier: p.mult || 1,
      composition: p.comp || null,
      images: [img],
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
