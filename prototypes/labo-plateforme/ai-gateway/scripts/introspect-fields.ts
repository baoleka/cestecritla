// Prints the field names (and their types) of a GraphQL type. With a dataset name from
// the `account` type, resolves its return type first (e.g. aiInferenceAdaptiveGroups).
import { graphql } from './cf-graphql.ts';

interface TypeRef {
  name: string | null;
  kind: string;
  ofType: TypeRef | null;
}
interface Field {
  name: string;
  type: TypeRef;
}
interface Introspection {
  __type: { name: string; fields: Field[] | null } | null;
}

function baseName(t: TypeRef): string {
  let cur: TypeRef = t;
  while (!cur.name && cur.ofType) cur = cur.ofType;
  return cur.name ?? '?';
}

async function fieldsOf(typeName: string): Promise<Field[]> {
  const res = await graphql<Introspection>(
    `
      query ($n: String!) {
        __type(name: $n) {
          name
          fields {
            name
            type {
              name
              kind
              ofType {
                name
                kind
                ofType {
                  name
                  kind
                  ofType {
                    name
                    kind
                  }
                }
              }
            }
          }
        }
      }
    `,
    { n: typeName },
  );
  if (!res.data?.__type)
    throw new Error(`type ${typeName} not found: ${JSON.stringify(res.errors)}`);
  return res.data.__type.fields ?? [];
}

const dataset = process.argv[2] ?? 'aiInferenceAdaptiveGroups';
const accountFields = await fieldsOf('account');
const ds = accountFields.find((f) => f.name === dataset);
if (!ds) throw new Error(`dataset ${dataset} not on account`);
const rowType = baseName(ds.type);
console.log(`# ${dataset} -> ${rowType}`);
for (const f of await fieldsOf(rowType)) {
  const sub = baseName(f.type);
  console.log(`${f.name}: ${sub}`);
  if (['sum', 'dimensions', 'avg', 'quantiles', 'max', 'min'].includes(f.name)) {
    for (const g of await fieldsOf(sub)) console.log(`  ${g.name}: ${baseName(g.type)}`);
  }
}
