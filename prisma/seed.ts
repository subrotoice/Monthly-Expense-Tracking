import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seed...');

  const categoriesData = [
    {
      name: 'Grocery',
      banglaName: 'মুদি বাজার',
      products: [
        { name: 'Rice', banglaName: 'চাল', defaultUnit: 'kg', aliases: ['chal', 'chaal', 'rice'] },
        { name: 'Lentils', banglaName: 'ডাল', defaultUnit: 'kg', aliases: ['dal', 'daal', 'lentils', 'masur dal', 'mushur dal'] },
        { name: 'Flour', banglaName: 'আটা', defaultUnit: 'kg', aliases: ['atta', 'maida', 'flour', 'moida'] },
        { name: 'Oil', banglaName: 'তেল', defaultUnit: 'liter', aliases: ['tel', 'oil', 'soyabean oil', 'sorishar tel'] },
        { name: 'Salt', banglaName: 'লবণ', defaultUnit: 'kg', aliases: ['laban', 'lobon', 'salt'] },
        { name: 'Sugar', banglaName: 'চিনি', defaultUnit: 'kg', aliases: ['chini', 'sugar'] },
        { name: 'Spices', banglaName: 'মসলা', defaultUnit: 'gram', aliases: ['mosla', 'halud', 'moriच', 'jira', 'spices'] },
        { name: 'Tea', banglaName: 'চা', defaultUnit: 'packet', aliases: ['cha', 'tea', 'ispahani'] },
      ]
    },
    {
      name: 'Vegetables',
      banglaName: 'সবজি',
      products: [
        { name: 'Potato', banglaName: 'আলু', defaultUnit: 'kg', aliases: ['alu', 'aloo', 'potato'] },
        { name: 'Onion', banglaName: 'পেঁয়াজ', defaultUnit: 'kg', aliases: ['peyaj', 'peyay', 'piaz', 'pyaj', 'onion'] },
        { name: 'Garlic', banglaName: 'রসুন', defaultUnit: 'kg', aliases: ['rasun', 'roshun', 'garlic'] },
        { name: 'Ginger', banglaName: 'আদা', defaultUnit: 'kg', aliases: ['ada', 'ginger'] },
        { name: 'Tomato', banglaName: 'টমেটো', defaultUnit: 'kg', aliases: ['tomato', 'tomator'] },
        { name: 'Eggplant', banglaName: 'বেগুন', defaultUnit: 'kg', aliases: ['begun', 'eggplant', 'brinjal'] },
        { name: 'Green Chili', banglaName: 'কাঁচা মরিচ', defaultUnit: 'kg', aliases: ['morich', 'kacha morich', 'chili'] },
        { name: 'Coriander', banglaName: 'ধনে পাতা', defaultUnit: 'gram', aliases: ['dhone pata', 'dhania', 'coriander'] },
        { name: 'Lemon', banglaName: 'লেবু', defaultUnit: 'piece', aliases: ['lebu', 'lemon'] },
        { name: 'Cucumber', banglaName: 'শসা', defaultUnit: 'kg', aliases: ['shosha', 'cucumber'] },
      ]
    },
    {
      name: 'Fruits',
      banglaName: 'ফল',
      products: [
        { name: 'Banana', banglaName: 'কলা', defaultUnit: 'dozen', aliases: ['kola', 'banana'] },
        { name: 'Apple', banglaName: 'আপেল', defaultUnit: 'kg', aliases: ['apul', 'apple'] },
        { name: 'Orange', banglaName: 'কমলা', defaultUnit: 'kg', aliases: ['komola', 'orange', 'malta'] },
        { name: 'Mango', banglaName: 'আম', defaultUnit: 'kg', aliases: ['aam', 'mango'] },
        { name: 'Guava', banglaName: 'পেয়ারা', defaultUnit: 'kg', aliases: ['peyara', 'guava'] },
        { name: 'Papaya', banglaName: 'পেঁপে', defaultUnit: 'piece', aliases: ['pepe', 'papaya'] },
      ]
    },
    {
      name: 'Fish',
      banglaName: 'মাছ',
      products: [
        { name: 'Rui', banglaName: 'রুই', defaultUnit: 'kg', aliases: ['rui mach', 'ruhi', 'rui'] },
        { name: 'Katla', banglaName: 'কাতলা', defaultUnit: 'kg', aliases: ['katla mach', 'katla'] },
        { name: 'Hilsa', banglaName: 'ইলিশ', defaultUnit: 'piece', aliases: ['ilish', 'ilisha', 'hilsa'] },
        { name: 'Pangash', banglaName: 'পাঙ্গাস', defaultUnit: 'kg', aliases: ['pangash mach', 'pangas'] },
        { name: 'Tilapia', banglaName: 'তেলাপিয়া', defaultUnit: 'kg', aliases: ['telapia', 'tilapia'] },
        { name: 'Shrimp', banglaName: 'চিংড়ি', defaultUnit: 'kg', aliases: ['chingri', 'shrimp', 'prawn'] },
      ]
    },
    {
      name: 'Meat',
      banglaName: 'মাংস',
      products: [
        { name: 'Chicken', banglaName: 'মুরগি', defaultUnit: 'kg', aliases: ['murgi', 'chicken', 'broiler'] },
        { name: 'Beef', banglaName: 'গরুর মাংস', defaultUnit: 'kg', aliases: ['goru', 'gorur mangso', 'beef'] },
        { name: 'Mutton', banglaName: 'খাসির মাংস', defaultUnit: 'kg', aliases: ['khashi', 'khashir mangso', 'mutton'] },
      ]
    },
    {
      name: 'Dairy & Eggs',
      banglaName: 'দুগ্ধ ও ডিম',
      products: [
        { name: 'Milk', banglaName: 'দুধ', defaultUnit: 'liter', aliases: ['dudh', 'milk', 'liquid milk'] },
        { name: 'Eggs', banglaName: 'ডিম', defaultUnit: 'piece', aliases: ['dim', 'egg', 'eggs'] },
        { name: 'Yogurt', banglaName: 'দই', defaultUnit: 'cup', aliases: ['doi', 'yogurt', 'tok doi', 'misti doi'] },
        { name: 'Butter', banglaName: 'মাখন', defaultUnit: 'piece', aliases: ['butter', 'makhon'] },
      ]
    },
    {
      name: 'Personal Care',
      banglaName: 'প্রসাধন ও ব্যক্তিগত যত্ন',
      products: [
        { name: 'Soap', banglaName: 'সাবান', defaultUnit: 'piece', aliases: ['saban', 'soap', 'lux'] },
        { name: 'Shampoo', banglaName: 'শ্যাম্পু', defaultUnit: 'bottle', aliases: ['shampoo', 'sampoo'] },
        { name: 'Toothpaste', banglaName: 'টুথপেস্ট', defaultUnit: 'piece', aliases: ['toothpaste', 'colgate'] },
        { name: 'Tissue', banglaName: 'টিস্যু', defaultUnit: 'packet', aliases: ['tissue', 'fay tissue'] },
      ]
    },
    {
      name: 'Household',
      banglaName: 'গৃহস্থালি',
      products: [
        { name: 'Detergent', banglaName: 'ডিটারজেন্ট', defaultUnit: 'kg', aliases: ['detergent', 'surf excel', 'rin'] },
        { name: 'Dishwashing Liquid', banglaName: 'ডিশওয়াশিং লিকুইড', defaultUnit: 'bottle', aliases: ['vim liquid', 'dishwash'] },
        { name: 'Cleaner', banglaName: 'ক্লিনার', defaultUnit: 'bottle', aliases: ['harpic', 'cleaner'] },
      ]
    }
  ];

  // Seed Categories
  for (const cat of categoriesData) {
    const category = await prisma.category.upsert({
      where: { name: cat.name },
      update: { banglaName: cat.banglaName },
      create: {
        name: cat.name,
        banglaName: cat.banglaName,
      },
    });

    // Seed Products & Aliases
    for (const prod of cat.products) {
      // Find or create product
      // We check if product name exists under this category to prevent duplicate creation
      const existingProduct = await prisma.product.findFirst({
        where: {
          name: prod.name,
          categoryId: category.id,
        },
      });

      let product;
      if (existingProduct) {
        product = await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            banglaName: prod.banglaName,
            defaultUnit: prod.defaultUnit,
          },
        });
      } else {
        product = await prisma.product.create({
          data: {
            name: prod.name,
            banglaName: prod.banglaName,
            defaultUnit: prod.defaultUnit,
            categoryId: category.id,
          },
        });
      }

      // Seed Aliases
      for (const aliasText of prod.aliases) {
        await prisma.productAlias.upsert({
          where: { alias: aliasText },
          update: { productId: product.id },
          create: {
            alias: aliasText,
            productId: product.id,
          },
        });
      }
    }
  }

  // Seed default Markets
  const markets = ['Local Bazar', 'Supershop (Shwapno)', 'Supershop (Agora)', 'Supershop (Meena Bazar)', 'Mudikhana (Grocer)'];
  for (const marketName of markets) {
    await prisma.market.upsert({
      where: { name: marketName },
      update: {},
      create: { name: marketName },
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });
