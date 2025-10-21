import pandas as pd
from params import *
from typing import Optional, Literal



def get_totals_by_country(in_df: pd.DataFrame):
    df = in_df.copy()
    # Calculate, for each country, total exports and imports separately.
    imp = df.groupby(["year", "importer"]).agg({'value_trln_USD': 'sum', 'quantity_mln_metric_tons':'sum'})
    exp = df.groupby(["year", "exporter"]).agg({'value_trln_USD': 'sum', 'quantity_mln_metric_tons':'sum'})
    imp.index.rename("country", level="importer", inplace=True)
    exp.index.rename("country", level="exporter", inplace=True)
    balance = exp - imp
    return exp.reset_index(), imp.reset_index(), balance.reset_index()

def get_food_totals_by_country(in_df: pd.DataFrame):
    df = in_df.copy()
    # only keep food related rows
    df = df[df["product_chapter"].isin(FOOD_CHAPTERS)]
    return get_totals_by_country(df)

def get_fuel_totals_by_country(in_df: pd.DataFrame):
    df = in_df.copy()
    # only keep fuel related rows
    df = df[df["product_chapter"] == "27"]
    return get_totals_by_country(df)

def get_total_trade(in_df: pd.DataFrame):
    df = in_df.copy()
    return df.groupby(["year"]).agg({'value_trln_USD': 'sum', 'quantity_mln_metric_tons':'sum'}).reset_index()

def get_top_deficit_surplus_countries(in_df: pd.DataFrame, ref_year=2023, keep_n=5):
    df = in_df.copy()
    # Pivot, make each country a column
    df = df.pivot(index='year', columns='country', values='value_trln_USD')
    df.reset_index(inplace=True)
    # Find top deficit and surplus countries on ref year
    all_balances_ref_year = df[df["year"] == ref_year].max()
    top_surplus = list(all_balances_ref_year.sort_values(ascending=False).iloc[1:keep_n+1].index)
    top_deficit = list(all_balances_ref_year.sort_values(ascending=True).iloc[0:keep_n].index)

    # find surplus countries in ref_year
    # TODO: problem here is that a surplus country in 2023 may be a deficit one in 2022.
    # Can address by separately finding surplus and deficiti countries per year?
    # Probably a good viz is to show a stacked barchart with surplus at the top and deficit at the bottom.

    # Better yet: don't show rest at all: instead show top_n divided by total deficit/surplus.
    # "How much of the deficit is undertaken by the top 5 countries?"
    # surplus_countries = list(all_balances_ref_year[all_balances_ref_year > 0].iloc[1:].index)
    # deficit_countries = list(all_balances_ref_year[all_balances_ref_year < 0].index)

    # rest_surplus_countries = list(set(surplus_countries) - set(top_surplus))
    # rest_deficit_countries = list(set(deficit_countries) - set(top_deficit))

    # surplus = df[["year"] + surplus_countries].copy()
    # deficit = df[["year"] + deficit_countries].copy()

    # # Sum the "others" that are not in the keep_n
    # surplus["other_surplus"] = surplus[rest_surplus_countries].sum(axis=1)
    # surplus.drop(columns=rest_surplus_countries, inplace=True)
    # deficit["other_deficit"] = deficit[rest_deficit_countries].sum(axis=1)
    # deficit.drop(columns=rest_deficit_countries, inplace=True)

    surplus = df[["year"] + top_surplus].copy()
    deficit = df[["year"] + top_deficit].copy()

    # Calculate total deficit and surplus per year
    total_surplus = df.iloc[:,1:].where(df >= 0, 0).sum(axis=1)
    total_deficit = df.iloc[:,1:].where(df < 0, 0).sum(axis=1)


    surplus.iloc[:,1:] = surplus.iloc[:,1:].divide(total_surplus, axis=0).mul(100.0)
    deficit.iloc[:,1:] = deficit.iloc[:,1:].divide(total_deficit, axis=0).mul(100.0)


    return surplus, deficit

def get_totals_per_chapter(in_df: pd.DataFrame):
    df = in_df.copy()
    df = df.groupby(["year", "product_chapter"]).agg({'value_trln_USD': 'sum', 'quantity_mln_metric_tons':'sum'})
    df.reset_index(inplace=True)
    # Sort by USD descending
    df = df.sort_values(by=["year", "value_trln_USD"], ascending=[True, False])
    return df

def get_imports_exports_for_country_per_year_chapter(df, country_code):
    cc_import_view = df[df["importer"] == country_code].copy()
    cc_export_view = df[df["exporter"] == country_code].copy()
    cc_import_view = cc_import_view.groupby(['importer', 'year', 'product_chapter']).agg({'value_trln_USD': 'sum', 'quantity_mln_metric_tons':'sum'})
    cc_export_view = cc_export_view.groupby(['exporter', 'year', 'product_chapter']).agg({'value_trln_USD': 'sum', 'quantity_mln_metric_tons':'sum'})
    cc_import_view.reset_index(level='importer', inplace=True, drop=True)
    cc_export_view.reset_index(level='exporter', inplace=True, drop=True)

    return cc_import_view, cc_export_view

def make_human_readable(df_in, cc_df, epc22_df, country_fmt=None, product_fmt=None):
    """ Map numeric values to human-readable names
    Options for country_fmt:
    * 'country_name'
    * 'country_iso2'
    * 'country_iso3'

    Options for product fmt:
    * 'hscode'
    * 'description'
    """
    if not country_fmt and not product_fmt:
        raise ValueError("Called without specifying any format")
    
    df = df_in.copy()
    if country_fmt:
        if country_fmt != 'country_name' and country_fmt != 'country_iso2' and country_fmt != 'country_iso3':
            raise ValueError(f"Country format {country_fmt} is invalid")
        converted = False
        if 'exporter' in df.columns:
            df['exporter'] = df['exporter'].map(cc_df.set_index('country_code')[country_fmt])
            converted = True
        if 'importer' in df.columns:
            df['importer'] = df['importer'].map(cc_df.set_index('country_code')[country_fmt])
            converted = True
        if 'country' in df.columns:
            df['country'] = df['country'].map(cc_df.set_index('country_code')[country_fmt])
            converted = True
        if not converted:
            raise ValueError(f"No expected column in {df.columns}")

    if product_fmt:
        if product_fmt != 'hscode' and product_fmt != 'description':
            raise ValueError(f"Country format {country_fmt} is invalid")
        if 'product_chapter' in df.columns:
            df['product_chapter'] = df['product_chapter'].map(epc22_df.set_index('hscode')[product_fmt])
        else:
            raise ValueError(f"No column product_chapter in {df.columns}")

    return df


def adjust_for_inflation(nominal_df, cpi_df, target_year, nominal_col="world_nominal_gdp"):
    """
    Adjusts nominal values using the CPI to express them in target-year dollars.

    Args:
        nominal_df (pd.DataFrame): DataFrame with columns 'year' and $nominal_col.
        cpi_df (pd.DataFrame): DataFrame with columns 'year' and 'cpi'.
        target_year (int): The year whose CPI will be used as the base for the adjustment.

    Returns:
        pd.DataFrame: A new DataFrame containing:
            - 'year'
            - $nominal_col: the original nominal GDP values.
            - 'real_{target_year}': thevalues adjusted to target-year dollars.
    
    Raises:
        ValueError: If the target_year is not present in the CPI DataFrame.
    """
    # Check if the target_year exists in the CPI data
    if target_year not in cpi_df['year'].values:
        raise ValueError(f"Target year {target_year} not found in CPI data")

    if len(nominal_df) != len(cpi_df):
        raise ValueError(f"CPI and nominal dataframes have different lengths - {len(cpi_df)} vs ({len(nominal_df)})")
    
    # Get the CPI for the target year
    target_cpi = cpi_df.loc[cpi_df['year'] == target_year, 'cpi'].values[0]
    
    # Merge the GDP and CPI data on 'year' so that each GDP value has the corresponding CPI
    merged_df = pd.merge(nominal_df, cpi_df, on='year', how='left')
    
    # Compute the GDP adjusted to target-year dollars
    # For each record:
    #     Adjusted GDP = Nominal GDP * (target_year CPI / CPI in that year)
    adjusted_column_name = f'real_{target_year}'
    merged_df[adjusted_column_name] = merged_df[nominal_col] * (target_cpi / merged_df['cpi'])
    
    # Return only the relevant columns
    return merged_df[['year', nominal_col, adjusted_column_name]]


def _chapter_totals_single_year(chapter_totals, cc_df, epc22_df,
                                year: int, keep_top_n: int,
                                merge_food=True) -> pd.DataFrame:
    """
    Build the Top-N+1 (“Other”) rows for one calendar year.
    """
    tmp = (
        chapter_totals.loc[chapter_totals["year"] == year,
                           ["product_chapter", "value_trln_USD",
                            "quantity_mln_metric_tons"]]
        .copy()
    )
    # convert chapters to human-readable names
    

    if merge_food:
        # collapse the very fine-grained food chapters
        food_rows = tmp[tmp["product_chapter"].isin(FOOD_CHAPTERS)]
        food_row = {
            "product_chapter": "Food Related",
            "value_trln_USD": food_rows["value_trln_USD"].sum(),
            "quantity_mln_metric_tons": food_rows["quantity_mln_metric_tons"].sum(),
        }
        tmp = tmp[~tmp["product_chapter"].isin(FOOD_CHAPTERS)]
        tmp = make_human_readable(tmp, cc_df, epc22_df, product_fmt="description")
        # include the aggregated food row
        tmp = (
            pd.concat([tmp, pd.DataFrame([food_row])], ignore_index=True)
        )
    else:
        tmp = make_human_readable(tmp, cc_df, epc22_df, product_fmt="description")
    
    # Rank by value
    tmp = tmp.sort_values("value_trln_USD", ascending=False)

    # keep top-N and aggregate everything else into “Other”
    top_n = tmp.iloc[:keep_top_n, :]
    other_row = {
        "product_chapter": "Other",
        "value_trln_USD": tmp.iloc[keep_top_n:]["value_trln_USD"].sum(),
        "quantity_mln_metric_tons": tmp.iloc[keep_top_n:]["quantity_mln_metric_tons"].sum(),
    }

    result = pd.concat([top_n, pd.DataFrame([other_row])], ignore_index=True)
    result.insert(0, "year", year)          # add a year column for later filtering
    return result


def get_chapter_totals_all_years(chapter_totals, cc_df, epc22_df,
                                 keep_top_n: int, merge_food=True) -> pd.DataFrame:
    """
    For every distinct year in *chapter_totals*, compute the Top-N+1 rows
    (including the aggregated “Other” row) and return a single DataFrame
    containing all years.
    """
    years = sorted(chapter_totals["year"].unique())
    per_year_frames = [
        _chapter_totals_single_year(chapter_totals, cc_df, epc22_df,
                                    year, keep_top_n, merge_food=merge_food)
        for year in years
    ]
    return pd.concat(per_year_frames, ignore_index=True)


def get_chapter_totals_for_year(chapter_totals, cc_df, epc22_df,
                                year: int, keep_top_n: int, merge_food=True) -> pd.DataFrame:
    """
    Compatibility wrapper that delegates to *get_chapter_totals_all_years*
    and then filters for the requested *year*.
    """
    all_years = get_chapter_totals_all_years(chapter_totals,
                                             cc_df, epc22_df,
                                             keep_top_n, merge_food=merge_food)
    return all_years.loc[all_years["year"] == year].reset_index(drop=True)

import pandas as pd
from typing import Literal

# ---------------------------------------------------------------------
# 1.  One year × one chapter
# ---------------------------------------------------------------------
def _top_partners_single_year_chapter(
    trades: pd.DataFrame,
    year: int,
    chapter: str,
    actor_col: Literal["importer", "exporter"],
    keep_top_n: int,
) -> pd.DataFrame:
    """
    Return a DataFrame with the top-*n* partners for the given
    (year, chapter), followed by an aggregated “Other” row.

    Columns of *trades* expected:
      ['year', 'exporter', 'importer',
       'product_chapter', 'value_trln_USD', 'quantity_mln_metric_tons']
    """
    # 1. slice the data we need ----------------------------------------
    cols = [actor_col, "value_trln_USD", "quantity_mln_metric_tons"]
    tmp = (
        trades.loc[
            (trades["year"] == year) & (trades["product_chapter"] == chapter),
            cols,
        ]
        .groupby(actor_col, as_index=False)
        .sum()
    )

    # 2. rank partners by value ----------------------------------------
    tmp = tmp.sort_values("value_trln_USD", ascending=False)

    # 3. split into top-n and “other” ----------------------------------
    top_n = tmp.iloc[:keep_top_n, :]
    other_needed = len(tmp) > keep_top_n
    if other_needed:
        other_row = {
            actor_col: "Other",
            "value_trln_USD": tmp.iloc[keep_top_n:]["value_trln_USD"].sum(),
            "quantity_mln_metric_tons": tmp.iloc[
                keep_top_n:
            ]["quantity_mln_metric_tons"].sum(),
        }
        top_n = pd.concat([top_n, pd.DataFrame([other_row])], ignore_index=True)

    # 4. annotate with year & chapter so we can concatenate later ------
    top_n.insert(0, "product_chapter", chapter)
    top_n.insert(0, "year", year)
    return top_n


# ---------------------------------------------------------------------
# 2.  All years × all chapters
# ---------------------------------------------------------------------
def get_top_partners_all_years(
    trades: pd.DataFrame,
    actor: Literal["importer", "exporter"],
    keep_top_n: int,
) -> pd.DataFrame:
    """
    Compute the top-*n* importers *or* exporters per
    (year, product_chapter).  Returns one tidy DataFrame whose rows are

        year · product_chapter · importer/exporter · value · quantity
    """
    actor_col = "importer" if actor == "importer" else "exporter"

    # iterate over every year × chapter that exists in the data -------
    frames = [
        _top_partners_single_year_chapter(
            trades, y, chap, actor_col, keep_top_n
        )
        for y in sorted(trades["year"].unique())
        for chap in sorted(trades.loc[trades["year"] == y, "product_chapter"].unique())
    ]
    return pd.concat(frames, ignore_index=True)


# ---------------------------------------------------------------------
# 3.  Convenience wrapper (filter to one year or one chapter)
# ---------------------------------------------------------------------
def get_top_partners(
    trades: pd.DataFrame,
    actor: Literal["importer", "exporter"],
    year: Optional[int] = None,
    chapter: Optional[str] = None,
    keep_top_n: int = 5,
) -> pd.DataFrame:
    """
    Wrapper that calls *get_top_partners_all_years* and then, if requested,
    filters the result to a specific year and/or chapter.
    """
    all_data = get_top_partners_all_years(trades, actor, keep_top_n)
    if year is not None:
        all_data = all_data.loc[all_data["year"] == year]
    if chapter is not None:
        all_data = all_data.loc[all_data["product_chapter"] == chapter]
    return all_data.reset_index(drop=True)


def standard_unit_and_name_conversions(df):
    df['value'] = df['value'].div(1000.0*1000.0*1000.0) # From thousands to USD trillions.
    df['quantity'] = df['quantity'].div(1000.0*1000.0) # From metric tons to millions of metric tons.
    df.rename(columns={'value': 'value_trln_USD', 'quantity': 'quantity_mln_metric_tons'}, inplace=True)
    return df

import pandas as pd

def get_country_name(country_code, cc_df: pd.DataFrame, fmt: str = "country_name") -> str:
    """
    Translate a single country code into a human-readable label.

    Parameters
    ----------
    country_code : int | str
        The code you want to translate.  It should correspond to the
        values that appear in cc_df['country_code'].
    cc_df : pandas.DataFrame
        A lookup table with (at minimum) the columns
        ['country_code', 'country_name', 'country_iso2', 'country_iso3'].
    fmt : {'country_name', 'country_iso2', 'country_iso3'}, default 'country_name'
        Which label you want back.

    Returns
    -------
    str
        The requested label for `country_code`.

    Raises
    ------
    ValueError
        If `fmt` is not recognised, `country_code` is missing from the
        lookup table, or the required columns are absent.
    """
    # --- basic validation ----------------------------------------------------
    allowed = {"country_name", "country_iso2", "country_iso3"}
    if fmt not in allowed:
        raise ValueError(f"Format '{fmt}' is invalid. Choose one of {sorted(allowed)}.")

    required_cols = {"country_code", *allowed}
    missing = required_cols.difference(cc_df.columns)
    if missing:
        raise ValueError(f"`cc_df` is missing columns: {sorted(missing)}")

    # --- build a Series keyed by country_code and fetch the value ------------
    mapping = cc_df.set_index("country_code")[fmt]

    try:
        return mapping.loc[country_code]
    except KeyError as exc:
        raise ValueError(f"Country code {country_code!r} not found in cc_df.") from exc

def get_product_chapter_name(
    product_chapter,
    epc22_df: pd.DataFrame,
    fmt: str = "description"
) -> str:
    """
    Translate a product-chapter code (HS-2) into a human-readable label.

    Parameters
    ----------
    product_chapter : int | str
        Chapter code to translate.  Must match the values in
        epc22_df['hscode'] (e.g. 1, 2, ..., '01', '02', ...).
    epc22_df : pandas.DataFrame
        Lookup table with at least the columns
        ['hscode', 'description'].
    fmt : {'hscode', 'description'}, default 'description'
        Which label to return.  'hscode' simply echoes the canonical
        code stored in the table; 'description' returns the text label.

    Returns
    -------
    str
        The requested label for `product_chapter`.

    Raises
    ------
    ValueError
        If `fmt` is invalid, the lookup table lacks required columns,
        or the chapter code is missing from the table.
    """
    # --- validate requested output format -----------------------------------
    allowed = {"hscode", "description"}
    if fmt not in allowed:
        raise ValueError(f"Format '{fmt}' is invalid. Choose one of {sorted(allowed)}.")

    # --- ensure lookup table is complete ------------------------------------
    required_cols = {"hscode", "description"}
    missing = required_cols.difference(epc22_df.columns)
    if missing:
        raise ValueError(f"`epc22_df` is missing columns: {sorted(missing)}")

    # --- build mapping and fetch the value ----------------------------------
    mapping = epc22_df.set_index("hscode")[fmt]

    try:
        return mapping.loc[product_chapter]
    except KeyError as exc:
        raise ValueError(
            f"Product chapter {product_chapter!r} not found in epc22_df."
        ) from exc
