// Model-level vehicle helpers shared by the public vehicle API, the bot
// prerender (seo-ld.js) and the sitemap. Pure — no DB access here.
//
// Why model level: the fleet carries several units of the same car (e.g. ten
// Ford Transit Çift Kabin, seven Fiat Fiorino). Each unit has its own
// /vehicles/:id page, and with only the year/transmission/fuel changing they
// were near-identical — Search Console folded almost every vehicle page into
// one ("Duplicate, Google chose different canonical than user"). Units of one
// model now share a single canonical page, and that page carries copy that is
// actually about the model (MODEL_COPY) plus a summary of the variants in the
// fleet, so different models no longer read alike either.

// "FİAT FİORİNO", "Fiat Fiorino" and "FIAT  FIORINO" are one model: strip
// diacritics (İ→I, Ç→C, Ö→O …), uppercase, collapse whitespace.
const modelKey = (brand, model) =>
  `${brand || ""} ${model || ""}`
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

// Per-model copy, keyed by modelKey(). Qualitative on purpose — no seat
// counts, litres or consumption figures that could drift from the actual
// units. A model missing here simply renders without this section; add an
// entry when a new model joins the fleet. The API sends it to the client
// (vehicles.controller getVehicleById → modelInfo.copy), so this is the single
// source for both the browser page and the crawler body.
const MODEL_COPY = {
  "FORD TRANSIT CIFT KABIN": {
    tr: {
      summary:
        "Ford Transit Çift Kabin, iki sıra koltuklu kabini ve arkasındaki açık yük kasasıyla ekibi ve malzemeyi tek araçta taşıyan bir kamyonet. Saha, şantiye ve servis işleri için tasarlandı.",
      idealFor: [
        "Saha ve şantiye ekiplerinin ulaşımı",
        "Malzeme ve ekipmanın açık kasada ekiple birlikte taşınması",
        "Aliağa sanayi bölgesindeki projeler için kısa ve uzun dönem kiralama",
      ],
    },
    en: {
      summary:
        "The Ford Transit Double Cab is a pickup with a two-row cab and an open cargo bed, carrying a crew and its materials in one vehicle. It is built for site, construction and service work.",
      idealFor: [
        "Getting site and construction crews to work",
        "Carrying materials and equipment on the open bed along with the team",
        "Short- and long-term hire for projects in the Aliağa industrial zone",
      ],
    },
  },
  "FIAT FIORINO": {
    tr: {
      summary:
        "Fiat Fiorino, şehir içinde kolay manevra yapan kompakt bir hafif ticari araç. Esnaf teslimatları ve küçük hacimli yük taşımaları için ekonomik bir seçenek.",
      idealFor: [
        "Şehir içi teslimat ve dağıtım",
        "Dar sokaklarda kolay manevra ve park",
        "Küçük işletmelerin günlük ticari kullanımı",
      ],
    },
    en: {
      summary:
        "The Fiat Fiorino is a compact light commercial vehicle that is easy to manoeuvre in town. It is an economical choice for shop deliveries and smaller loads.",
      idealFor: [
        "In-town deliveries and distribution",
        "Easy manoeuvring and parking on narrow streets",
        "Everyday commercial use for small businesses",
      ],
    },
  },
  "FIAT EGEA": {
    tr: {
      summary:
        "Fiat Egea, geniş iç hacmi ve bagajıyla aile ve iş kullanımına uygun bir sedan. Uzun yolda konforlu, şehir içinde ekonomik bir kiralama seçeneği.",
      idealFor: ["Aile seyahatleri ve tatil", "İş seyahatleri ve şehirlerarası yolculuk", "Aylık uzun dönem kiralama"],
    },
    en: {
      summary:
        "The Fiat Egea is a sedan with a roomy cabin and boot, suited to family and business use. Comfortable on long trips and economical in town.",
      idealFor: ["Family trips and holidays", "Business travel and intercity journeys", "Monthly long-term rental"],
    },
  },
  "FIAT DOBLO": {
    tr: {
      summary:
        "Fiat Doblo, yüksek tavanı ve sürgülü yan kapılarıyla hem yolcu hem yük taşımaya uygun çok amaçlı bir araç.",
      idealFor: [
        "Kalabalık aileler ve bol bagajlı yolculuklar",
        "Esnaf ve küçük işletmelerin yük taşıması",
        "Havalimanı transferleri",
      ],
    },
    en: {
      summary:
        "The Fiat Doblo is a versatile vehicle with a high roof and sliding side doors, suited to carrying both passengers and cargo.",
      idealFor: ["Larger families and trips with lots of luggage", "Small businesses moving goods", "Airport transfers"],
    },
  },
  "RENAULT CLIO": {
    tr: {
      summary:
        "Renault Clio, kompakt ölçüleri ve çevik sürüşüyle şehir içi kullanıma uygun bir hatchback. Kolay park edilir, günlük işler için pratiktir.",
      idealFor: ["Şehir içi kısa süreli kiralama", "Tek kişilik veya çift yolculuklar", "Kolay park gerektiren günlük işler"],
    },
    en: {
      summary:
        "The Renault Clio is a hatchback whose compact size and nimble handling suit city driving. It is easy to park and practical for everyday errands.",
      idealFor: ["Short city rentals", "Solo trips or travelling as a couple", "Errands where easy parking matters"],
    },
  },
  "SKODA OCTAVIA": {
    tr: {
      summary:
        "Skoda Octavia, geniş bagaj hacmi ve konforlu iç mekânıyla öne çıkan bir üst orta sınıf otomobil. Uzun yolda ve iş seyahatlerinde rahat bir sürüş sunar.",
      idealFor: ["İş toplantıları ve kurumsal kullanım", "Konforlu uzun yol seyahatleri", "Bol bagajlı tatil yolculukları"],
    },
    en: {
      summary:
        "The Skoda Octavia is an upper-mid-size car known for its large boot and comfortable cabin. It makes long drives and business trips relaxed.",
      idealFor: ["Business meetings and corporate use", "Comfortable long-distance trips", "Holidays with plenty of luggage"],
    },
  },
  "CITROEN C3": {
    tr: {
      summary:
        "Citroën C3, yumuşak sürüşü ve kompakt gövdesiyle şehir içinde rahat kullanılan bir hatchback.",
      idealFor: ["Bütçe dostu şehir içi kiralama", "Kısa mesafeli günlük işler", "Kolay park"],
    },
    en: {
      summary: "The Citroën C3 is a compact hatchback with a soft ride that is comfortable to drive around town.",
      idealFor: ["Budget-friendly city rental", "Short everyday trips", "Easy parking"],
    },
  },
  "ISUZU NPR3D": {
    tr: {
      summary: "Isuzu NPR, ağır ve hacimli yükler için tasarlanmış bir kamyonet.",
      idealFor: ["Ev ve ofis taşıma", "İnşaat malzemesi ve ekipman taşıma", "Ticari yük dağıtımı"],
    },
    en: {
      summary: "The Isuzu NPR is a light truck built for heavy and bulky loads.",
      idealFor: ["Home and office moves", "Carrying building materials and equipment", "Commercial freight distribution"],
    },
  },
  "FIAT DUCATO": {
    tr: {
      summary:
        "Fiat Ducato, büyük iç hacmi sayesinde hacimli yükler ya da kalabalık gruplar için kullanılan büyük boy bir ticari araç.",
      idealFor: ["Hacimli yük ve eşya taşıma", "Ekip ve grup ulaşımı", "Ticari projelerde uzun dönem kullanım"],
    },
    en: {
      summary:
        "The Fiat Ducato is a large commercial vehicle whose generous interior is used for bulky loads or bigger groups.",
      idealFor: ["Moving bulky goods and furniture", "Team and group transport", "Long-term use on commercial projects"],
    },
  },
  "FIAT PANDA": {
    tr: {
      summary:
        "Fiat Panda, kısa gövdesi ve yüksek oturma pozisyonuyla şehir içinde pratik bir küçük otomobil.",
      idealFor: ["Şehir içi günlük ulaşım", "Dar sokaklarda kolay manevra ve park", "Kısa süreli ekonomik kiralama"],
    },
    en: {
      summary: "The Fiat Panda is a small car whose short body and high seating position make it practical in town.",
      idealFor: ["Everyday city driving", "Easy manoeuvring and parking on narrow streets", "Short, economical rentals"],
    },
  },
  "DACIA SANDERO": {
    tr: {
      summary: "Dacia Sandero, sade ve dayanıklı yapısıyla bütçe dostu bir hatchback.",
      idealFor: ["Uygun bütçeli kiralama", "Şehir içi ve kısa şehirlerarası yolculuklar", "Günlük işler"],
    },
    en: {
      summary: "The Dacia Sandero is a simple, sturdy and budget-friendly hatchback.",
      idealFor: ["Rentals on a budget", "City driving and short intercity trips", "Everyday errands"],
    },
  },
  "CITROEN JUMPY SPACETOURER": {
    tr: {
      summary:
        "Citroën Jumpy SpaceTourer, geniş yolcu kabini ve bagaj alanıyla kalabalık gruplar için tasarlanmış bir yolcu van'ı.",
      idealFor: ["Havalimanı grup transferleri", "Kalabalık aile ve arkadaş seyahatleri", "Kurumsal ekip ulaşımı"],
    },
    en: {
      summary:
        "The Citroën Jumpy SpaceTourer is a passenger van with a large cabin and luggage space, designed for groups.",
      idealFor: ["Group airport transfers", "Trips with family or friends", "Corporate team transport"],
    },
  },
  "RENAULT TALIANT": {
    tr: {
      summary: "Renault Taliant, kompakt dış ölçülerine karşın geniş bagaj hacmi sunan bir sedan.",
      idealFor: ["Ekonomik aile kullanımı", "Şehirlerarası yolculuklar", "Bagajlı tatil seyahatleri"],
    },
    en: {
      summary: "The Renault Taliant is a sedan that offers a large boot despite its compact exterior.",
      idealFor: ["Economical family use", "Intercity journeys", "Holidays with luggage"],
    },
  },
};

const getModelCopy = (brand, model) => MODEL_COPY[modelKey(brand, model)] || null;

const uniqueSorted = (values) => [...new Set(values.filter((v) => v != null && v !== ""))].sort();

// units: the active fleet units of one model [{ modelYear, transmission, fuelType }].
// Raw enum values — the caller labels transmissions/fuels for its locale.
const summarizeVariants = (units) => {
  const years = units.map((u) => u.modelYear).filter((y) => Number.isInteger(y));
  return {
    count: units.length,
    minYear: years.length ? Math.min(...years) : null,
    maxYear: years.length ? Math.max(...years) : null,
    transmissions: uniqueSorted(units.map((u) => u.transmission)),
    fuelTypes: uniqueSorted(units.map((u) => u.fuelType)),
  };
};

// Units of one model share a single canonical page: the earliest-listed unit
// (most likely to already carry search signals), ties broken by id so the
// choice is stable.
// vehicles: [{ id, brand, model, createdAt }]
// Returns Map<vehicleId, canonicalId|null> — null means "this IS the canonical".
const buildCanonicalVehicleMap = (vehicles) => {
  const clusters = new Map();
  for (const v of vehicles) {
    const key = modelKey(v.brand, v.model);
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(v);
  }
  const time = (d) => (d ? new Date(d).getTime() : 0);
  const result = new Map();
  for (const group of clusters.values()) {
    const [winner] = [...group].sort((a, b) => time(a.createdAt) - time(b.createdAt) || (a.id < b.id ? -1 : 1));
    for (const v of group) result.set(v.id, v.id === winner.id ? null : winner.id);
  }
  return result;
};

// "Benzer Araçlar": the canonical page of other models — never another unit
// of the same model (that only linked a duplicate of the current page). Same
// body type (car / van / truck) first, then alphabetical.
// active: every active unit [{ id, brand, model, bodyType, createdAt }]
const pickRelatedModels = (active, vehicle, limit = 4) => {
  const ownKey = modelKey(vehicle.brand, vehicle.model);
  const canonical = buildCanonicalVehicleMap(active);
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  return active
    .filter((v) => canonical.get(v.id) === null && modelKey(v.brand, v.model) !== ownKey)
    .map((v) => ({ id: v.id, name: `${clean(v.brand)} ${clean(v.model)}`.trim(), sameBody: v.bodyType === vehicle.bodyType }))
    .sort((a, b) => Number(b.sameBody) - Number(a.sameBody) || a.name.localeCompare(b.name, "tr"))
    .slice(0, limit)
    .map(({ id, name }) => ({ id, name }));
};

// One entry per model: its canonical unit (see buildCanonicalVehicleMap) plus
// `bodyTypes`, every body type its units carry — units of one model are not
// always classified alike (some FORD TRANSİT ÇİFT KABİN units were entered as
// BINEK), so a page that filters by body type must look at the whole model.
// Mirrored in src/utils/vehicle-model.js groupFleetByModel.
// units: active fleet units [{ id, brand, model, bodyType, createdAt, ... }]
const groupFleetByModel = (units) => {
  const canonical = buildCanonicalVehicleMap(units);
  const bodyTypes = new Map();
  for (const u of units) {
    const key = modelKey(u.brand, u.model);
    if (!bodyTypes.has(key)) bodyTypes.set(key, new Set());
    bodyTypes.get(key).add(u.bodyType);
  }
  return units
    .filter((u) => canonical.get(u.id) === null)
    .map((u) => ({ ...u, bodyTypes: [...bodyTypes.get(modelKey(u.brand, u.model))] }));
};

module.exports = {
  modelKey,
  groupFleetByModel,
  MODEL_COPY,
  getModelCopy,
  summarizeVariants,
  buildCanonicalVehicleMap,
  pickRelatedModels,
};
