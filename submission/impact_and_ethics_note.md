# Impact and Ethics Note: Diabetes risk screening (Track 6)
**Team:** Your Team Name · Member 1, Member 2, Member 3 · Tech Wave 2026

## What it is
A prototype that gives primary-care clinicians a quick, explainable estimate of a person's risk of prediabetes or diabetes from 16 simple questions, with a suggested follow-up date. It is a **prototype, not a diagnosis and not a replacement for clinical judgement or medical advice.**

## Who benefits
Adults who would otherwise be diagnosed late (IDF 2024: about 28% of adults with diabetes in Mauritius are undiagnosed, [source](https://diabetesatlas.org/data-by-location/country/mauritius/)); nurses and GPs who need a fast, trustworthy aid; and health planners who can prioritise follow-up.

## Data
Trained only on the public CDC BRFSS 2015 survey (253,680 responses, 13.9% prevalence). **No real patient data was used, and none is collected.** Income, education and US-insurance variables were excluded from the model.

## Results (held-out test set)
ROC-AUC 0.82; at the screening threshold sensitivity 80%, specificity 69%, NPV 95%; PPV 29% (screening trades precision for catching cases). Benchmarked against gradient boosting.

## Risks and how we reduce them
| Risk | Mitigation |
|---|---|
| Over-reliance or being read as a diagnosis | Permanent prototype banner in all three languages; wording says "estimated risk"; confirmatory blood test recommended |
| False reassurance | A LOW band still suggests re-screening in 3 years; sensitivity target 80% (not 100%) is stated openly |
| Unfairness across groups | Subgroup audit by sex, age, income and education (see model card); socio-economic variables not used as predictors |
| US-to-Mauritius mismatch | Probabilities labelled as uncalibrated for Mauritius; local validation is step 2 of deployment |
| Privacy | No storage, no accounts, no network use of inputs; users told not to enter names or IDs |
| Translation errors | French and Kreol Morisien text to be reviewed by native speakers and clinicians |

## Fairness: what we can and cannot claim
Sexes are treated alike (sensitivity gap 1%). **Age is the main gap:** at the screening threshold the tool flags 38% of true cases aged 18-39 but 87% of those 70+, because younger people have low base risk; clinicians should not treat a LOW result in a young adult with strong risk factors as reassurance. Lower-income and less-educated groups are flagged more often (including more false positives), which means a higher referral burden for them even though income and education are not model inputs. The data **has no ethnicity variable**, so fairness across Mauritian communities is **not yet tested**; it is a required step before any pilot.

## Deployment path
1) Public prototype and clinician feedback. 2) Validation and recalibration on de-identified Mauritian data under ethics approval. 3) Supervised pilot in a few primary-care centres, tracking cases found, follow-ups completed and referral burden. 4) Regular re-audit of performance and fairness.
