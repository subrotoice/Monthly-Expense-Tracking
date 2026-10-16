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
        { name: 'Lentils', banglaName: 'ডাল', defaultUnit: 'kg', aliases: ['dal', 'daal', 'lentils'] },
        { name: 'Masoor Dal', banglaName: 'মসুর ডাল', defaultUnit: 'kg', aliases: ['masoor dal', 'mushur dal', 'masur dal', 'mosur dal', 'red lentils'] },
        { name: 'Moong Dal', banglaName: 'মুগ ডাল', defaultUnit: 'kg', aliases: ['mug dal', 'moong dal', 'mung dal', 'yellow lentils'] },
        { name: 'Chana Dal', banglaName: 'ছোলার ডাল / বুটের ডাল', defaultUnit: 'kg', aliases: ['chola dal', 'cholar dal', 'booter dal', 'buter dal', 'chana dal', 'split chickpeas'] },
        { name: 'Khesari Dal', banglaName: 'খেসারি ডাল', defaultUnit: 'kg', aliases: ['khesari dal', 'khesari', 'kesari dal'] },
        { name: 'Mashkalai Dal', banglaName: 'মাষকলাই ডাল', defaultUnit: 'kg', aliases: ['mashkalai dal', 'maskalai dal', 'kalai dal', 'urad dal', 'mashkalai'] },
        { name: 'Motor Dal', banglaName: 'মটর ডাল', defaultUnit: 'kg', aliases: ['motor dal', 'matar dal', 'mator dal', 'pea lentils'] },
        { name: 'Arhar Dal', banglaName: 'অড়হর ডাল', defaultUnit: 'kg', aliases: ['arhar dal', 'orhor dal', 'toor dal', 'pigeon pea'] },
        { name: 'Flour', banglaName: 'ময়দা', defaultUnit: 'kg', aliases: ['atta', 'maida', 'flour', 'moida'] },
        { name: 'Oil', banglaName: 'তেল', defaultUnit: 'liter', aliases: ['tel', 'oil', 'soyabean oil', 'sorishar tel'] },
        { name: 'Salt', banglaName: 'লবণ', defaultUnit: 'kg', aliases: ['laban', 'lobon', 'salt'] },
        { name: 'Sugar', banglaName: 'চিনি', defaultUnit: 'kg', aliases: ['chini', 'sugar'] },
        { name: 'Tea', banglaName: 'চা', defaultUnit: 'packet', aliases: ['cha', 'tea', 'ispahani'] },
        { name: 'Cumin', banglaName: 'জিরা', defaultUnit: 'gram', aliases: ['jira', 'jeera', 'cumin'] },
        { name: 'Coriander Powder', banglaName: 'ধনিয়া', defaultUnit: 'gram', aliases: ['dhonia', 'dhoniya', 'coriander powder'] },
        { name: 'Turmeric', banglaName: 'হলুদ', defaultUnit: 'gram', aliases: ['holud', 'halud', 'turmeric'] },
        { name: 'Dry Chili', banglaName: 'শুকনা মরিচ', defaultUnit: 'gram', aliases: ['shukna morich', 'dry chili', 'red chili'] },
        { name: 'Raisins', banglaName: 'কিসমিস', defaultUnit: 'gram', aliases: ['kismis', 'kishmish', 'raisins'] },
        { name: 'Cashew', banglaName: 'কাজুবাদাম', defaultUnit: 'gram', aliases: ['kaju badam', 'cashew', 'kaju'] },
        { name: 'Black Pepper', banglaName: 'গোলমরিচ', defaultUnit: 'gram', aliases: ['golmorich', 'black pepper', 'pepper'] },
        { name: 'Garam Masala', banglaName: 'গরমমশলা', defaultUnit: 'gram', aliases: ['garam masala', 'gorom mosla'] },
        { name: 'Bay Leaf', banglaName: 'তেজপাতা', defaultUnit: 'gram', aliases: ['tejpata', 'bay leaf', 'tezpata'] },
      ]
    },
    {
      name: 'Vegetables',
      banglaName: 'সবজি',
      products: [
        { name: 'Potato', banglaName: 'আলু', defaultUnit: 'kg', aliases: ['alu', 'aloo', 'potato'] },
        { name: 'Onion', banglaName: 'পেঁয়াজ', defaultUnit: 'kg', aliases: ['peyaj', 'peyay', 'piaz', 'pyaj', 'onion'] },
        { name: 'Garlic', banglaName: 'রসুন', defaultUnit: 'kg', aliases: ['rasun', 'roshun', 'garlic'] },
        { name: 'Ginger', banglaName: 'আদা', defaultUnit: 'kg', aliases: ['ada', 'aada', 'ginger'] },
        { name: 'Tomato', banglaName: 'টমেটো', defaultUnit: 'kg', aliases: ['tomato', 'tomator'] },
        { name: 'Eggplant', banglaName: 'বেগুন', defaultUnit: 'kg', aliases: ['begun', 'eggplant', 'brinjal'] },
        { name: 'Green Chili', banglaName: 'কাঁচা মরিচ', defaultUnit: 'kg', aliases: ['morich', 'kacha morich', 'chili'] },
        { name: 'Coriander Leaves', banglaName: 'ধনে পাতা', defaultUnit: 'gram', aliases: ['dhone pata', 'dhania pata', 'coriander leaves'] },
        { name: 'Lemon', banglaName: 'লেবু', defaultUnit: 'piece', aliases: ['lebu', 'lemon'] },
        { name: 'Cucumber', banglaName: 'শসা', defaultUnit: 'kg', aliases: ['shosha', 'cucumber'] },
        { name: 'Spinach', banglaName: 'শাক', defaultUnit: 'kg', aliases: ['shak', 'spinach', 'greens'] },
        { name: 'Pumpkin', banglaName: 'কুমড়া', defaultUnit: 'kg', aliases: ['kumra', 'kumda', 'pumpkin'] },
        { name: 'Beans', banglaName: 'সিম', defaultUnit: 'kg', aliases: ['shim', 'sim', 'beans'] },
        { name: 'Taro', banglaName: 'মান', defaultUnit: 'kg', aliases: ['man kochu', 'taro'] },
        { name: 'Elephant Yam', banglaName: 'ওল', defaultUnit: 'kg', aliases: ['ol', 'yam', 'elephant yam'] },
        { name: 'Bhadal', banglaName: 'ভাদাল', defaultUnit: 'kg', aliases: ['bhadal', 'vadal'] },
        { name: 'Banana Flower', banglaName: 'কলার মোচা', defaultUnit: 'piece', aliases: ['kolar mocha', 'banana flower', 'mocha'] },
        { name: 'Wild Fig', banglaName: 'ডুমুর', defaultUnit: 'kg', aliases: ['dumur', 'fig', 'wild fig'] },
        { name: 'Bitter Gourd Small', banglaName: 'উচ্ছে', defaultUnit: 'kg', aliases: ['uchche', 'bitter gourd small'] },
        { name: 'Cabbage', banglaName: 'বাঁধাকপি', defaultUnit: 'piece', aliases: ['badha kopi', 'cabbage'] },
        { name: 'Cauliflower', banglaName: 'ফুলকপি', defaultUnit: 'piece', aliases: ['ful kopi', 'cauliflower'] },
        { name: 'Pointed Gourd', banglaName: 'পটল', defaultUnit: 'kg', aliases: ['potol', 'pointed gourd'] },
        { name: 'Carrot', banglaName: 'গাজর', defaultUnit: 'kg', aliases: ['gajor', 'carrot'] },
        { name: 'Green Banana', banglaName: 'কাঁচাকলা', defaultUnit: 'kg', aliases: ['kacha kola', 'green banana'] },
        { name: 'Taro Stem', banglaName: 'কচুর লতি', defaultUnit: 'kg', aliases: ['kochor loti', 'taro stem'] },
        { name: 'Taro Root', banglaName: 'কচুরমুখি', defaultUnit: 'kg', aliases: ['kochor mukhi', 'taro root'] },
        { name: 'Okra', banglaName: 'ঢেঁড়স', defaultUnit: 'kg', aliases: ['dherosh', 'okra', 'lady finger'] },
        { name: 'Long Beans', banglaName: 'বরবটি', defaultUnit: 'kg', aliases: ['barboti', 'long beans', 'yard beans'] },
        { name: 'Spine Gourd', banglaName: 'কাকরোল', defaultUnit: 'kg', aliases: ['kakrol', 'spine gourd'] },
        { name: 'Bitter Melon', banglaName: 'করলা', defaultUnit: 'kg', aliases: ['korola', 'bitter melon'] },
        { name: 'Papaya', banglaName: 'পেঁপে', defaultUnit: 'piece', aliases: ['pepe', 'papaya'] },
      ]
    },
    {
      name: 'Fruits',
      banglaName: 'ফল',
      products: [
        { name: 'Fruit', banglaName: 'ফল', defaultUnit: 'kg', aliases: ['fol', 'fruit', 'fruits'] },
        { name: 'Banana', banglaName: 'কলা', defaultUnit: 'dozen', aliases: ['kola', 'banana'] },
        { name: 'Apple', banglaName: 'আপেল', defaultUnit: 'kg', aliases: ['apul', 'apple'] },
        { name: 'Orange', banglaName: 'কমলা', defaultUnit: 'kg', aliases: ['komola', 'orange', 'malta'] },
        { name: 'Mango', banglaName: 'আম', defaultUnit: 'kg', aliases: ['aam', 'mango'] },
        { name: 'Guava', banglaName: 'পেয়ারা', defaultUnit: 'kg', aliases: ['peyara', 'guava'] },
      ]
    },
    {
      name: 'Fish',
      banglaName: 'মাছ',
      products: [
        { name: 'Fish', banglaName: 'মাছ', defaultUnit: 'kg', aliases: ['mach', 'fish', 'maach'] },
        { name: 'Rui', banglaName: 'রুই', defaultUnit: 'kg', aliases: ['rui mach', 'ruhi', 'rui'] },
        { name: 'Katla', banglaName: 'কাতলা', defaultUnit: 'kg', aliases: ['katla mach', 'katla'] },
        { name: 'Hilsa', banglaName: 'ইলিশ', defaultUnit: 'piece', aliases: ['ilish', 'ilisha', 'hilsa'] },
        { name: 'Pangash', banglaName: 'পাঙ্গাস', defaultUnit: 'kg', aliases: ['pangash mach', 'pangas'] },
        { name: 'Tilapia', banglaName: 'তেলাপিয়া', defaultUnit: 'kg', aliases: ['telapia', 'tilapia'] },
        { name: 'Shrimp', banglaName: 'চিংড়ি', defaultUnit: 'kg', aliases: ['chingri', 'shrimp', 'prawn'] },
        { name: 'Dried Fish', banglaName: 'শুটকি', defaultUnit: 'kg', aliases: ['shutki', 'dry fish', 'shutki mach'] },
      ]
    },
    {
      name: 'Meat',
      banglaName: 'মাংস',
      products: [
        { name: 'Meat', banglaName: 'মাংস', defaultUnit: 'kg', aliases: ['mangsho', 'meat', 'mangso'] },
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
        { name: 'Handwash', banglaName: 'হ্যান্ডওয়াশ', defaultUnit: 'bottle', aliases: ['handwash', 'hand wash'] },
      ]
    },
    {
      name: 'Household',
      banglaName: 'গৃহস্থালি',
      products: [
        { name: 'Detergent', banglaName: 'রিন / ডিটারজেন্ট', defaultUnit: 'kg', aliases: ['detergent', 'surf excel', 'rin'] },
        { name: 'Dishwashing Liquid', banglaName: 'লিকুইড', defaultUnit: 'bottle', aliases: ['vim liquid', 'dishwash', 'liquid'] },
        { name: 'Toilet Cleaner', banglaName: 'হারপিক', defaultUnit: 'bottle', aliases: ['harpic', 'toilet cleaner', 'cleaner'] },
        { name: 'Vim Bar', banglaName: 'ভীম', defaultUnit: 'piece', aliases: ['vim', 'bhim', 'vim bar'] },
        { name: 'Vixol', banglaName: 'ভিক্সল', defaultUnit: 'bottle', aliases: ['vixol', 'bikkhol', 'floor cleaner'] },
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
