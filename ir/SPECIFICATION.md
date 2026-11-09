# EduASM-IR 1.0.0

Normativní datový kontrakt mezi moduly EduASM. IR je nezávislá na konkrétní procesorové architektuře.

## Zásady
- IR se předává jako UTF-8 JSON.
- Kořenový objekt obsahuje `ir: "EduASM-IR"`, `version: "1.0.0"`, `wordSize` a `functions`.
- Program je tvořen funkcemi, basic blocks, instrukcemi a explicitními terminátory.
- Instrukce mají pole `op`; operandy mají vlastní diskriminátor `type`.
- Neznámé instrukce nebo nepodporované konstrukce se nesmějí tiše ignorovat.

## Operand
Operand registru má tvar:

```json
{"type":"register","id":"r2","base":"rcx","alias":"ecx","width":32,"offset":0}
```

`id` je identifikátor registru v rámci cílové architektury. `base` označuje základní registr, `alias` konkrétní použitý název, `width` šířku v bitech a `offset` bitový posun od nejnižšího bitu základního registru. IR neurčuje žádný pevný seznam registrů ani jejich názvů. Identifikátory a aliasy definuje popis cílové architektury, který dodává příslušný modul.

Další operandy:
- konstanta: `{"type":"value","value":"42","width":64}`; hodnota je řetězec v desítkové nebo hexadecimální podobě,
- label: `{"type":"label","name":"loop"}`,
- predikát: `{"type":"predicate","name":"zf"}`.

Šířka registru je kladné celé číslo. Konkrétní povolené šířky, aliasy, pravidla zápisu a mapování registrů určuje target description, nikoli společné IR schéma.

## Program
```json
{
  "ir": "EduASM-IR",
  "version": "1.0.0",
  "wordSize": 64,
  "functions": [{
    "name": "main",
    "entry": "entry",
    "blocks": [{
      "id": "entry",
      "label": "entry",
      "instructions": [{
        "op": "move",
        "dst": {"type":"register","id":"r2","base":"rcx","alias":"ecx","width":32,"offset":0},
        "src": {"type":"value","value":"10","width":32}
      }],
      "terminator": {"op":"return"}
    }]
  }]
}
```

`entry` odkazuje na label existujícího bloku funkce. Každý blok má `id`, `label`, pole `instructions` a právě jeden `terminator`.

## Instrukce
| `op` | Význam a hlavní pole |
|---|---|
| `move` | Kopie `src` do `dst`. |
| `binary` | Binární operace `operator` nad `left` a `right`, výsledek do `dst`. |
| `unary` | Unární operace `operator` nad `source`, výsledek do `dst`. |
| `cast` | Rozšíření/zúžení `source` do `dst`; `kind` a `sourceWidth` určují pravidlo. |
| `compare` | Porovnání `left`, `right`; výsledek do predikátu `result`, podmínka `condition`. |
| `test` | Bitový test `left` a `right`, výsledek do predikátu `result`. |
| `nop` | Bez efektu. |

Terminátory:
- `{"op":"return"}`
- `{"op":"jump","target":"label"}`
- `{"op":"branch","condition":{"type":"predicate","name":"p0"},"trueTarget":"then","falseTarget":"else"}`

## Cílová architektura
Target description je samostatná součást modulu cílové architektury. Obsahuje minimálně seznam registrů, jejich identifikátory a aliasy, šířky, offsety a pravidla zápisu. Může obsahovat také podporované instrukce, endianitu a syntaxi assembleru.

**Rozšíření o další registr nebo alias nikdy nevyžaduje změnu této IR specifikace ani JSON Schema.** Student upravuje pouze svůj modul a jeho target description. `ir/` je centrálně spravovaná a pro studentské práce pouze ke čtení.

## Validace
`eduasm-ir.schema.json` ověřuje obecnou strukturu dat. Záměrně neověřuje, zda konkrétní registr existuje v daném procesoru. To ověřuje modul cílové architektury podle svého target description.
