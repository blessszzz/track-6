# Data (not stored in this repository)

Download the CDC BRFSS 2015 "Diabetes Health Indicators Dataset" (Kaggle: alexteboul/diabetes-health-indicators-dataset) and place these files here:

- diabetes_binary_health_indicators_BRFSS2015.csv  (main, used for training)
- diabetes_binary_5050split_health_indicators_BRFSS2015.csv  (comparison only)
- diabetes_012_health_indicators_BRFSS2015.csv  (not used)

Then run `python src/train.py --data-dir data` from the project root. The trained model (`models/model.json`) and results (`reports/`) are already committed, so you only need the data to retrain.
