/**
 * Gameplay-only metadata for the community tech directory.
 * A high overall score means a technique is useful in practice, NOT permitted.
 * No score is shown until every core metric is rated by an admin.
 */
export const RATING_FIELDS = Object.freeze([
  {id:'execution',label:'Execution difficulty',hint:'5 = very hard to perform'},
  {id:'counter',label:'Counter difficulty',hint:'5 = very hard to stop'},
  {id:'advantage',label:'Advantage',hint:'5 = large gameplay benefit'},
  {id:'consistency',label:'Consistency',hint:'5 = works reliably'},
  {id:'save',label:'GK save difficulty',hint:'5 = very hard for the goalkeeper to save',optional:true}
]);
export const CORE_RATING_IDS = Object.freeze(RATING_FIELDS.filter(field=>!field.optional).map(field=>field.id));
export const TAG_GROUPS = Object.freeze([
  {label:'Mechanic',tags:['Shooting','Dribbling','Movement','Defense','Goalkeeping','Passing']},
  {label:'Requirements',tags:['Style-specific','Awakening','Ball possession','Precise timing','Specific positioning']},
  {label:'Network',tags:['Ping-dependent','FPS-sensitive','Server-dependent']},
  {label:'Counterplay',tags:['Interceptable','GK-saveable','Timing-based','Positioning-based']}
]);
export const ALL_TECH_TAGS = Object.freeze(TAG_GROUPS.flatMap(group=>group.tags));

export function validRating(value){
  return Number.isInteger(value)&&value>=1&&value<=5;
}

/** Equal weight: ease of execution + difficulty to counter + advantage + consistency. */
export function overallRating(ratings){
  if(!ratings||typeof ratings!=='object'||CORE_RATING_IDS.some(id=>!validRating(ratings[id])))return null;
  return Math.round(((6-ratings.execution+ratings.counter+ratings.advantage+ratings.consistency)/4)*10)/10;
}
