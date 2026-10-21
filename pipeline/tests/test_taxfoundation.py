import taxfoundation as tf

HEADER = ('"Year","Married Filing Jointly (Rates/Brackets)","","","Married Filing Separately '
          '(Rates/Brackets)","","","Single Filer (Rates/Brackets)","","","Head of Household '
          '(Rates/Brackets)","","","Notes:"')


def test_parses_rates_thresholds_and_notes(tmp_path):
    p = tmp_path / "tf.csv"
    p.write_text("\n".join([
        HEADER,
        '"1963","20.0%",">","$0","20.0%",">","$0","20.0%",">","$0","20.0%",">","$0","A note."',
        '"1963","91.0%",">","$400,000","91.0%",">","$200,000","91.0%",">","$200,000","91.0%",">","$300,000",""',
        '"","","","","","","","","","","","","",""',
        '"1862","No income tax","","","","","","","","","","","",""',
    ]) + "\n")
    tf.schedules.cache_clear()
    s = tf.schedules(p)
    assert s[1963]["single"] == [(0.2, 0.0), (0.91, 200000.0)]
    assert s[1963]["mfj"][-1] == (0.91, 400000.0)
    assert 1862 not in s
    assert tf.notes(p) == {1963: "A note."}
    tf.schedules.cache_clear()
