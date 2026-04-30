import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  const pw = await bcrypt.hash("demo1234", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@canonix.app" },
    update: {},
    create: { email: "demo@canonix.app", name: "Canonix", password: pw },
  });

  const u = await prisma.universe.upsert({
    where: { slug: "star-wars" },
    update: {},
    create: { name: "Star Wars", slug: "star-wars", description: "Давно-давно, в далёкой-далёкой галактике…", visibility: "public", userId: user.id },
  });

  const mk = (name: string, type: string, cf: object, date?: string, desc?: string, notes?: object[]) =>
    prisma.entity.create({ data: { name, type, universeId: u.id, description: desc, date, customFields: JSON.stringify(cf), notes: JSON.stringify(notes || []) } });

  const anakin = await mk("Энакин Скайуокер", "character", { race: "Человек", gender: "М", height: "188 см", planet: "Татуин", family: "Шми (мать), Люк (сын), Лея (дочь)" }, "41 BBY", "Избранный, ставший Дартом Вейдером", [{ title: "Падение", content: "Стал Вейдером после дуэли на Мустафаре." }]);
  const obiwan = await mk("Оби-Ван Кеноби", "character", { race: "Человек", gender: "М", height: "182 см", planet: "Стьюджон" }, "57 BBY", "Мастер-джедай");
  const luke = await mk("Люк Скайуокер", "character", { race: "Человек", gender: "М", height: "172 см", planet: "Татуин", family: "Энакин (отец), Лея (сестра)" }, "19 BBY", "Последний джедай");
  const palpatine = await mk("Палпатин", "character", { race: "Человек", gender: "М", height: "170 см", planet: "Набу" }, "84 BBY", "Император, Дарт Сидиус");
  const padme = await mk("Падме Амидала", "character", { race: "Человек", gender: "Ж", height: "165 см", planet: "Набу", family: "Энакин (муж)" }, "46 BBY", "Королева Набу");

  const tatooine = await mk("Татуин", "planet", { region: "Внешнее Кольцо", type: "Пустынная", faction: "Хатты" }, undefined, "Пустынная планета");
  const mustafar = await mk("Мустафар", "planet", { region: "Внешнее Кольцо", type: "Вулканическая", faction: "Техносоюз" }, undefined, "Вулканическая планета");
  const naboo = await mk("Набу", "planet", { region: "Среднее Кольцо", type: "Умеренная", faction: "Республика" }, undefined, "Родина Падме");
  const coruscant = await mk("Корусант", "planet", { region: "Центр", type: "Экюменополис", faction: "Республика" }, undefined, "Столица Республики");

  const duel = await mk("Дуэль на Мустафаре", "event", { location: "Мустафар", participants: "Оби-Ван, Энакин", outcome: "Поражение Энакина" }, "19 BBY", "Финальная битва");
  const order66 = await mk("Приказ 66", "event", { location: "Вся галактика", outcome: "Уничтожение джедаев" }, "19 BBY", "Уничтожение Ордена джедаев");
  const fallRepublic = await mk("Падение Республики", "event", { location: "Корусант", outcome: "Провозглашение Империи" }, "19 BBY", "Палпатин стал Императором");

  const jedi = await mk("Орден джедаев", "organization", { period: "~25 000 BBY — 19 BBY", members: "Оби-Ван, Энакин, Йода" }, undefined, "Хранители мира и справедливости");
  const sith = await mk("Орден ситхов", "organization", { period: "~6000 BBY — 4 ABY", members: "Палпатин, Вейдер" }, undefined, "Тёмная сторона Силы");
  const empire = await mk("Галактическая Империя", "organization", { period: "19 BBY — 4 ABY", members: "Палпатин, Вейдер" }, undefined, "Тиранический режим Палпатина");
  const rebels = await mk("Повстанческий альянс", "organization", { period: "2 BBY — 4 ABY", members: "Люк, Лея, Хан" }, undefined, "Сопротивление Империи");

  const rl = (sourceId: string, targetId: string, label: string) =>
    prisma.relation.create({ data: { sourceId, targetId, label, universeId: u.id } });

  await rl(anakin.id, obiwan.id, "ученик");
  await rl(obiwan.id, anakin.id, "наставник");
  await rl(anakin.id, padme.id, "муж");
  await rl(padme.id, anakin.id, "жена");
  await rl(anakin.id, luke.id, "отец");
  await rl(luke.id, anakin.id, "сын");
  await rl(anakin.id, jedi.id, "член");
  await rl(anakin.id, sith.id, "член");
  await rl(obiwan.id, jedi.id, "мастер");
  await rl(luke.id, jedi.id, "член");
  await rl(luke.id, rebels.id, "член");
  await rl(palpatine.id, sith.id, "владыка");
  await rl(palpatine.id, empire.id, "правитель");
  await rl(anakin.id, tatooine.id, "родом с");
  await rl(luke.id, tatooine.id, "вырос на");
  await rl(padme.id, naboo.id, "родом с");
  await rl(palpatine.id, naboo.id, "родом с");
  await rl(duel.id, mustafar.id, "место");
  await rl(duel.id, obiwan.id, "участник");
  await rl(duel.id, anakin.id, "участник");
  await rl(order66.id, palpatine.id, "инициатор");
  await rl(fallRepublic.id, coruscant.id, "место");
  await rl(fallRepublic.id, palpatine.id, "инициатор");
  await rl(jedi.id, sith.id, "враги");
  await rl(empire.id, rebels.id, "враги");

  // Dune universe — listed on marketplace with open license
  const dune = await prisma.universe.upsert({
    where: { slug: "dune" },
    update: {},
    create: { name: "Dune", slug: "dune", description: "Пустынная планета Арракис", visibility: "public", license: "open", listedAt: new Date(), userId: user.id },
  });

  const paul = await prisma.entity.create({ data: { name: "Пол Атрейдес", type: "character", universeId: dune.id, description: "Муад'Диб", customFields: JSON.stringify({ race: "Человек", gender: "М", planet: "Каладан" }), notes: "[]" } });
  const arrakis = await prisma.entity.create({ data: { name: "Арракис", type: "planet", universeId: dune.id, description: "Пустынная планета, единственный источник спайса", customFields: JSON.stringify({ region: "Внешние миры", type: "Пустыня" }), notes: "[]" } });
  const fremen = await prisma.entity.create({ data: { name: "Фримены", type: "organization", universeId: dune.id, description: "Свободные люди пустыни", customFields: JSON.stringify({ period: "~10 000 AG" }), notes: "[]" } });

  await prisma.relation.create({ data: { sourceId: paul.id, targetId: arrakis.id, label: "родом с", universeId: dune.id } });
  await prisma.relation.create({ data: { sourceId: paul.id, targetId: fremen.id, label: "лидер", universeId: dune.id } });
  await prisma.relation.create({ data: { sourceId: fremen.id, targetId: arrakis.id, label: "обитают на", universeId: dune.id } });

  // Cyberpunk universe — listed on marketplace with paid license
  const cyber = await prisma.universe.upsert({
    where: { slug: "cyberpunk-2099" },
    update: {},
    create: { name: "Cyberpunk 2099", slug: "cyberpunk-2099", description: "Неоновый мегаполис будущего, где корпорации правят всем", visibility: "public", license: "paid", price: 499, listedAt: new Date(), userId: user.id },
  });

  const v = await prisma.entity.create({ data: { name: "V", type: "character", universeId: cyber.id, description: "Наёмник, ищущий бессмертия", customFields: JSON.stringify({ race: "Человек", gender: "М/Ж", planet: "Найт-Сити" }), notes: "[]" } });
  const nc = await prisma.entity.create({ data: { name: "Найт-Сити", type: "planet", universeId: cyber.id, description: "Мегаполис свободного рынка", customFields: JSON.stringify({ region: "Калифорния", type: "Мегаполис" }), notes: "[]" } });
  const arasaka = await prisma.entity.create({ data: { name: "Арасака", type: "organization", universeId: cyber.id, description: "Мегакорпорация", customFields: JSON.stringify({ period: "XXI век" }), notes: "[]" } });

  await prisma.relation.create({ data: { sourceId: v.id, targetId: nc.id, label: "живёт в", universeId: cyber.id } });
  await prisma.relation.create({ data: { sourceId: v.id, targetId: arasaka.id, label: "противник", universeId: cyber.id } });
  await prisma.relation.create({ data: { sourceId: arasaka.id, targetId: nc.id, label: "контролирует", universeId: cyber.id } });

  console.log("Seed complete!");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
