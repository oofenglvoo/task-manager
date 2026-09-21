"""节假日数据归一化测试（纯函数，不依赖登录态）。"""

from app.routers.holidays import _normalize


def test_normalize_reads_camel_case_from_source():
    """源站（holiday-cn）用驼峰 isOffDay。"""
    payload = {
        "days": [
            {"date": "2026-10-01", "name": "国庆节", "isOffDay": True},
            {"date": "2026-10-10", "name": "国庆节", "isOffDay": False},
        ]
    }
    result = _normalize(payload, 2026)

    assert result["year"] == 2026
    assert [(d["date"], d["is_off_day"]) for d in result["days"]] == [
        ("2026-10-01", True),
        ("2026-10-10", False),
    ]


def test_normalize_reads_snake_case_from_cache():
    """写回缓存的是归一化后的 is_off_day，二次读取必须同样能识别。

    回归点：以前只认 isOffDay，读缓存时取到 None，bool(None) 让所有
    节假日被误判为「班」。
    """
    cached = {
        "year": 2026,
        "days": [
            {"date": "2026-10-01", "name": "国庆节", "is_off_day": True},
            {"date": "2026-10-10", "name": "国庆节", "is_off_day": False},
        ],
    }
    result = _normalize(cached, 2026)

    assert [(d["date"], d["is_off_day"]) for d in result["days"]] == [
        ("2026-10-01", True),
        ("2026-10-10", False),
    ]


def test_normalize_is_idempotent():
    """归一化结果再次归一化应保持不变（抓取 -> 写缓存 -> 读缓存）。"""
    source = {
        "days": [
            {"date": "2026-01-01", "name": "元旦", "isOffDay": True},
            {"date": "2026-02-14", "name": "春节", "isOffDay": False},
        ]
    }
    first = _normalize(source, 2026)
    second = _normalize(first, 2026)

    assert first == second


def test_normalize_handles_camel_case_precedence():
    """两个字段同时存在时以源站的驼峰字段为准。"""
    payload = {
        "days": [
            {"date": "2026-05-01", "name": "劳动节", "isOffDay": True, "is_off_day": False}
        ]
    }
    result = _normalize(payload, 2026)

    assert result["days"][0]["is_off_day"] is True


def test_normalize_skips_entries_without_date():
    payload = {"days": [{"name": "无日期", "isOffDay": True}, {"date": "2026-01-01", "isOffDay": True}]}
    result = _normalize(payload, 2026)

    assert len(result["days"]) == 1
    assert result["days"][0]["date"] == "2026-01-01"


def test_normalize_tolerates_missing_days():
    assert _normalize({}, 2026) == {"year": 2026, "days": []}
    assert _normalize({"days": None}, 2026) == {"year": 2026, "days": []}
