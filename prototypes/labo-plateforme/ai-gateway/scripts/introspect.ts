// Lists the GraphQL datasets available on the account whose name mentions AI / neurons.
import { graphql } from './cf-graphql.ts';

interface Field {
  name: string;
  type: { name: string | null; ofType: { name: string | null } | null };
}
interface Introspection {
  __type: { fields: Field[] } | null;
}

const res = await graphql<Introspection>(`
  {
    __type(name: "account") {
      fields {
        name
        type {
          name
          ofType {
            name
          }
        }
      }
    }
  }
`);
if (!res.data?.__type) {
  console.error(JSON.stringify(res.errors));
  process.exit(1);
}
const names = res.data.__type.fields
  .map((f) => f.name)
  .filter((n) => /ai|neuron|inference/i.test(n));
console.log(names.join('\n'));
