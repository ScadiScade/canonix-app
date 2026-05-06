import { TranslationKey } from "@/lib/i18n";

export interface TemplateGroup {
  name: string;
  slug: string;
  color: string;
  icon: string;
  fields: string[];
  isContainer?: boolean;
}

export interface UniverseTemplate {
  id: string;
  nameKey: TranslationKey;
  descKey: TranslationKey;
  groups: TemplateGroup[];
}

export const TEMPLATES: UniverseTemplate[] = [
  {
    id: "empty",
    nameKey: "templates.empty",
    descKey: "templates.emptyDesc",
    groups: [],
  },
  {
    id: "fantasy",
    nameKey: "templates.fantasy",
    descKey: "templates.fantasyDesc",
    groups: [
      { name: "Персонаж", slug: "character", color: "#2D5BE3", icon: "Users", fields: ["Раса", "Пол", "Возраст", "Рост", "Происхождение", "Класс", "Семья", "Организация"] },
      { name: "Место", slug: "place", color: "#16A34A", icon: "Globe", fields: ["Регион", "Тип", "Фракция", "Климат", "Население", "Описание"] },
      { name: "Событие", slug: "event", color: "#D97706", icon: "Zap", fields: ["Дата", "Место", "Участники", "Стороны", "Исход", "Последствия"] },
      { name: "Организация", slug: "organization", color: "#9333EA", icon: "Building2", fields: ["Период", "Лидер", "Члены", "Союзники", "Враги", "Структура"] },
      { name: "Раса", slug: "race", color: "#EC4899", icon: "Heart", fields: ["Продолжительность жизни", "Место обитания", "Способности", "Культура", "Отношения"] },
      { name: "Магия", slug: "magic", color: "#06B6D4", icon: "Sparkles", fields: ["Тип", "Школа", "Стоимость", "Ограничения", "Описание"] },
    ],
  },
  {
    id: "scifi",
    nameKey: "templates.scifi",
    descKey: "templates.scifiDesc",
    groups: [
      { name: "Персонаж", slug: "character", color: "#2D5BE3", icon: "Users", fields: ["Раса", "Пол", "Возраст", "Рост", "Планета", "Специализация", "Организация"] },
      { name: "Планета", slug: "planet", color: "#16A34A", icon: "Globe", fields: ["Сектор", "Тип", "Фракция", "Климат", "Население", "Ресурсы"] },
      { name: "Событие", slug: "event", color: "#D97706", icon: "Zap", fields: ["Дата", "Место", "Участники", "Стороны", "Исход", "Последствия"] },
      { name: "Фракция", slug: "faction", color: "#9333EA", icon: "Building2", fields: ["Период", "Лидер", "Члены", "Союзники", "Враги", "Штаб"] },
      { name: "Технология", slug: "technology", color: "#06B6D4", icon: "Cpu", fields: ["Тип", "Уровень", "Стоимость", "Ограничения", "Описание"] },
      { name: "Корабль", slug: "ship", color: "#EC4899", icon: "Rocket", fields: ["Класс", "Экипаж", "Вооружение", "Скорость", "Владелец"], isContainer: true },
    ],
  },
  {
    id: "dnd",
    nameKey: "templates.dnd",
    descKey: "templates.dndDesc",
    groups: [
      { name: "NPC", slug: "npc", color: "#2D5BE3", icon: "Users", fields: ["Раса", "Класс", "Уровень", "Выравнивание", "Роль", "Мотивация", "Место"] },
      { name: "Локация", slug: "location", color: "#16A34A", icon: "Globe", fields: ["Регион", "Тип", "Опасность", "Климат", "Особенности", "Секреты"] },
      { name: "Квест", slug: "quest", color: "#D97706", icon: "Zap", fields: ["Уровень", "Тип", "Заказчик", "Цель", "Награда", "Срок"] },
      { name: "Фракция", slug: "faction", color: "#9333EA", icon: "Building2", fields: ["Лидер", "Члены", "Союзники", "Враги", "Цель", "Репутация"] },
      { name: "Предмет", slug: "item", color: "#06B6D4", icon: "Package", fields: ["Тип", "Редкость", "Свойства", "Требования", "Описание"] },
      { name: "Монстр", slug: "monster", color: "#EF4444", icon: "Skull", fields: ["Тип", "CR", "HP", "AC", "Способности", "Среда обитания"] },
    ],
  },
  {
    id: "real",
    nameKey: "templates.real",
    descKey: "templates.realDesc",
    groups: [
      { name: "Персона", slug: "person", color: "#2D5BE3", icon: "Users", fields: ["Дата рождения", "Дата смерти", "Национальность", "Профессия", "Известен как"] },
      { name: "Страна", slug: "country", color: "#16A34A", icon: "Globe", fields: ["Континент", "Столица", "Население", "Площадь", "Язык", "ВВП"] },
      { name: "Событие", slug: "event", color: "#D97706", icon: "Zap", fields: ["Дата", "Место", "Участники", "Стороны", "Исход", "Последствия"] },
      { name: "Организация", slug: "organization", color: "#9333EA", icon: "Building2", fields: ["Год основания", "Штаб", "Члены", "Деятельность", "Руководство"] },
    ],
  },
];
