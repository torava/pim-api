import fs from 'fs';
import { Model } from 'objection';

import Category from '../src/models/Category';
import { getCategoriesFromCsv, getCategoryParentsFromCsv } from '../src/utils/categories';
import { getExternalCategoriesFineli, getEntitiesFromCsv } from '../src/utils/import';
import Attribute from '../src/models/Attribute';
import Recommendation from '../src/models/Recommendation';
import RecommendationSource from '../src/models/RecommendationSource';

const SEED_SUFFIX = process.env.SEED_SUFFIX || '';
const DELIMITER = process.env.DELIMITER || ';';

exports.seed = async knex => {
  Model.knex(knex);
  
  try {
    if (!SEED_SUFFIX) {
      await getExternalCategoriesFineli('seeds/Fineli_Rel20__74_ravintotekij__');
    }
  } catch (error) {
    console.error('error while adding Fineli categories', error);
  }

  const sourcesCsv = fs.readFileSync(`${__dirname}/sources${SEED_SUFFIX}.csv`, 'utf8');
  const sources = getEntitiesFromCsv(sourcesCsv, { delimiter: DELIMITER });
  
  const categoriesCsv = fs.readFileSync(`${__dirname}/categories${SEED_SUFFIX}.csv`, 'utf8');
  const categories = getEntitiesFromCsv(categoriesCsv, { delimiter: DELIMITER });

  const sourceRecordIdMap = {};

  try {
    await getCategoriesFromCsv(categories, sources, sourceRecordIdMap);
  } catch (error) {
    console.error('error while adding CSV categories', error);
  }
  try {
    const categoryParents = await getCategoryParentsFromCsv(categories);
    await Category.query()
    .upsertGraph(categoryParents, {
      noDelete: true,
      relate: true,
      allowRefs: true
    });
  } catch (error) {
    console.error('error while adding CSV category parents', error);
  }

  if (!SEED_SUFFIX) {
    const attributes = await Attribute.query();

    const recommendationsCsv = fs.readFileSync(`${__dirname}/recommendations.csv`, 'utf8');
    getEntitiesFromCsv(recommendationsCsv, { delimiter: DELIMITER }).filter(entity => entity.minValue || entity.maxValue).forEach(async entity => {
      const attributeId = attributes.find(attribute => attribute.name['en-US'].toLocaleLowerCase() === entity['attribute.name["en-US"]'].toLocaleLowerCase())?.id;
      const sourceId = sourceRecordIdMap[entity.sourceId]?.id || undefined;
      delete entity['attribute.name["en-US"]'];
      delete entity.sourceId;
      try {
        const recommendation = await Recommendation.query().insert({
          ...entity,
          attributeId,
          minValue: parseFloat(entity.minValue) || undefined,
          maxValue: parseFloat(entity.maxValue) || undefined,
          avgValue: parseFloat(entity.avgValue) || undefined,
          minimumAge: parseInt(entity.minimumAge) || undefined,
          maximumAge: parseInt(entity.maximumAge) || undefined,
          weight: parseFloat(entity.weight) || undefined,
          pav: parseInt(entity.pav) || undefined,
          pal: parseFloat(entity.pal) || undefined
        });
        await RecommendationSource.query().insert({
          recommendationId: recommendation.id,
          sourceId
        });
      } catch (error) {
        console.error('error while adding recommendations', error);
      }
    });
  }
};
