from flask import Flask, render_template, jsonify, request
import pandas as pd

app = Flask(__name__)

# Load datasets
datasets = {
    #csv 파일의 Date 컬럼을 pandas의 datetime 타입으로 불러옴
    "Marketing": pd.read_csv('static/data/marketing.csv', parse_dates=['Date']),
    "Financial": pd.read_csv('static/data/financial.csv', parse_dates=['Date'])
}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/datasets")
def get_datasets():
    return jsonify({"datasets": list(datasets.keys())})

@app.route("/variables")
def get_variables():
    dataset = request.args.get("dataset", "Marketing")
    df = datasets.get(dataset)
    if df is not None:
        variables = df.columns.drop(['Date', 'Group']).tolist()
        #데이터의 시작 날짜 및 종료 날짜 탐색
        min_date = df['Date'].min().strftime('%Y-%m-%d')
        max_date = df['Date'].max().strftime('%Y-%m-%d')
        return jsonify({"variables": variables, "min_date": min_date, "max_date": max_date})
    else:
        return jsonify({"error": "Invalid dataset."}), 400

@app.route("/correlation", methods=["POST"])
def correlation():
    data = request.json
    dataset_name = data.get("dataset")
    selected_vars = data.get("variables", [])
    date_range = data.get("date_range", [])
    group = data.get("group", None)
    method = data.get("method", "pearson")
    moderator = data.get("moderator", None)

    df = datasets.get(dataset_name)
    if df is None:
        return jsonify({"error": "Invalid dataset."}), 400

    #선택 날짜에 대한 데이터만 파싱
    if date_range:
        df = df[(df['Date'] >= date_range[0]) & (df['Date'] <= date_range[1])]

    #선택 그룹에 대한 데이터만 파싱
    if group and group != "All":
        df = df[df['Group'] == group]

    if moderator and moderator not in selected_vars:
        selected_vars.append(moderator)

    #moderator 변수 및 선택한 값에 대한 data frame value만 파싱
    subset = df[selected_vars].dropna()
    #선택 변수에 대한 correlation matrix 생성
    correlation_matrix = subset.corr(method=method).to_dict()

    #moderator 변수에 대한 적응형 correlation matrix 생성
    adjusted_correlations = None
    if moderator:
        adjusted_correlations = {var: subset[[var, moderator]].corr().iloc[0,1]
                                 for var in selected_vars if var != moderator}

    strong_correlations = []
    seen_pairs = set()
    for i in selected_vars:
        for j in selected_vars:
            if i != j:
                sorted_pair = tuple(sorted([i, j]))
                if sorted_pair not in seen_pairs:
                    corr_value = correlation_matrix[i][j]
                    if abs(corr_value) > 0.7: #상관계수가 0.7 이상이면 강한 상관관계라고 판단
                        strong_correlations.append({
                            "var1": i,
                            "var2": j,
                            "value": corr_value
                        })
                    seen_pairs.add(sorted_pair) #상관관계는 대칭된 값을 가지므로, 중복 제거

    return jsonify({
        "correlation_matrix": correlation_matrix,
        "strong_correlations": strong_correlations,
        "adjusted_correlations": adjusted_correlations
    })

@app.route("/detailed_analysis", methods=["POST"])
def detailed_analysis():
    data = request.json
    dataset_name = data.get("dataset", "Marketing")
    var1 = data.get("var1")
    var2 = data.get("var2")
    method = data.get("method", "pearson")

    df = datasets.get(dataset_name)
    if df is None:
        return jsonify({"error": "Invalid dataset."}), 400

    #날짜 기준으로 data frame 정렬
    df_sorted = df.sort_values('Date').set_index('Date')
    rolling_corr = []

    #rolling 함수를 사용하여 30일 구간의 데이터 윈도우를 생성
    for window in df_sorted.rolling(window=30):
        #결측값이 있다면 계산을 생략
        if window[var1].isnull().any() or window[var2].isnull().any():
            continue
        corr_value = window[var1].corr(window[var2], method=method)
        rolling_corr.append({"Date": window.index[-1], "Rolling_Correlation": corr_value})

    analysis_data = pd.DataFrame(rolling_corr).dropna()
    analysis_data['Date'] = analysis_data['Date'].dt.strftime('%Y-%m-%d')
    return jsonify({
        "analysis_data": analysis_data.to_dict(orient="records"),
        "var1": var1,
        "var2": var2
    })

if __name__ == "__main__":
    app.run(debug=True)
