# EduASM – přehled

EduASM je modulární výukové prostředí pro překladače a interpretaci assembleru.

## Moduly

- `blockly/` (BP1): Blockly ↔ EduASM-IR.
- `ir-to-x86-64/` (BP2): EduASM-IR → NASM x86-64.
- `ir-interpreter/` (BP3): interpretace EduASM-IR.
- `x86-64-to-ir/` (BP4): NASM x86-64 → EduASM-IR.
- `www/` (BP5): webové rozhraní a propojení modulů.
- `ir/`: společná specifikace EduASM-IR a JSON Schema; pouze ke čtení.
- `ir-generic/`, `generic-ir/`: demonstrační převodníky pro obecnou virtuální ISA.

## Základní pravidlo

Moduly spolu komunikují výhradně prostřednictvím EduASM-IR. Konkrétní registry, aliasy a instrukční schopnosti patří do popisu cílové architektury příslušného modulu. Studenti neupravují obsah `ir/`.

## Rozsah demonstrační implementace

Dodané demo ověřuje základní tok `MOV`, `ADD` a `SUB` na dvou registrech. Nejde o úplnou implementaci všech konstrukcí popsaných v EduASM-IR.

## Popis cílové architektury (`targetInfo`)

Backend cílové architektury exportuje vedle `moduleInfo` také `targetInfo`:

```js
export const targetInfo = {
  id: "edu-generic",
  name: "Obecný EduASM",
  wordSize: 64,
  registers: [
    { id: "r0", name: "A", base: "A", width: 64, offset: 0, aliases: ["A"] },
    { id: "r1", name: "B", base: "B", width: 64, offset: 0, aliases: ["B"] }
  ]
};
```

`id` registru musí být stabilní a jedinečné v rámci cíle. `name` je zobrazovaný název. `base`, `width`, `offset` a `aliases` popisují mapování registru a jeho aliasů. Webová aplikace používá `targetInfo` pro nabídku registrů v Blockly, panel registrů a trace. Interpreter inicializuje stav podle seznamu registrů v `targetInfo`. Rozšíření seznamu registrů proto nevyžaduje změnu společné IR ani webové aplikace.

Modul, který registr přidá, musí upravit také vlastní parser/generátor a deklarovat, jak s registrem pracuje. `targetInfo` je součástí rozhraní cílového modulu, nikoli společné IR.


## Stabilita rozhraní pro semestr

Pro studentské implementace je závazná specifikace **EduASM-IR 1.0.0** v adresáři
`ir/` a modulové rozhraní `moduleInfo` (`id`, `apiVersion`, `irVersion`).
Specifikace a JSON Schema v `ir/` jsou pro studenty pouze ke čtení.

Po dobu semestru se neplánují nekompatibilní změny společné IR ani modulového
kontraktu. Rozšíření konkrétní architektury (registry, aliasy, podporované
instrukce a jejich překlad) se provádí v příslušném studentském modulu a jeho
`targetInfo`, nikoli změnou společné specifikace.

`targetInfo` popisuje konkrétní cílovou architekturu. Minimálně obsahuje
identifikátor cíle, název, velikost slova a registry. Modul může deklarovat
také podporované instrukce a další vlastnosti cíle. Konkrétní rozšíření
`targetInfo` musí být zdokumentováno v daném modulu a nesmí měnit význam
stávajících polí.

Demonstrační aplikace v této verzi podporuje pouze omezenou podmnožinu
instrukcí. To není omezení rozsahu studentských implementací; studenti
rozšiřují své moduly podle zadání. Nepodporované prvky se nesmějí tiše
převádět na jiné registry nebo instrukce ani tiše zahazovat. Verze 1.2.2
zachovává bezpečnostní chování při přepnutí cíle: pokud aktuální Blockly
program obsahuje registr, který cílová architektura nezná, přepnutí se odmítne,
aby nedošlo ke ztrátě nebo změně programu.

Případné nové obecné mechanismy pro přenos a vizualizaci instrukcí či operandů,
které cílová architektura nezná, budou řešeny až jako samostatná, verzovaná
změna po skončení semestru. Studenti je nyní nemají implementovat každý
samostatně ani kvůli nim upravovat `ir/`.
