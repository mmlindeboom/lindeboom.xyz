const Airtable = require('airtable');

Airtable.configure({ apiKey: 'keydVeD210bV4LfwK' });

const base = Airtable.base('appUfMV0Mfw6l4Wqx');
const table = base('PeriodicTable');


const getRecords = async () => {
  const allRecords = [];
  const data = await table.select().eachPage((records, fetchNextPage) => {
    records.forEach((record) => {
      allRecords.push(record);
    });

    fetchNextPage();
  }, (err) => {
    if (err) {
      return err;
    }


    return allRecords.map((record) => record.fields);
  });

  return data;
};

const data = await getRecords()
console.log(data)