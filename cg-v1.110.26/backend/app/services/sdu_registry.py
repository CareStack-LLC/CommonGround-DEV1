"""
State Disbursement Unit (SDU) registry.

Wave 4-Alt pivot: CommonGround no longer processes child support money.
Parents pay their state SDU directly (mandated under Title IV-D of the
Social Security Act — every state runs one). CommonGround just redirects
and logs the payment for court evidence.

This module is pure data + small helpers. No DB. No Stripe. No external
HTTP. It's safe to call from anywhere in the request path.

Source of truth
---------------
Federal index (always authoritative): https://www.acf.hhs.gov/css/partners/state-child-support-agencies
Individual state URLs change occasionally — verify quarterly.

Each entry reports:
    state_code        ISO 2-letter
    state_name        display name
    sdu_name          official name of the SDU (varies by state)
    sdu_url           public payment portal parents land on
    info_url          background info / setup (may be same as sdu_url)
    phone             customer-service line when known
    requires_county   True when the state handles SDU at the county level
                      (parents must pick a county before the portal URL
                      is meaningful — rare but notable in IL, etc.)
    accepts_online    True when the portal supports online payments. When
                      False, parents must mail a money order; we still
                      record the logged payment but flag it.
    notes             brief disambiguation shown in UI if non-empty
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class SduEntry:
    state_code: str
    state_name: str
    sdu_name: str
    sdu_url: str
    info_url: str
    phone: Optional[str]
    requires_county: bool
    accepts_online: bool
    notes: Optional[str] = None


# Federal fallback — shown when a user's state is missing from the registry
# (shouldn't happen, but defensive).
FEDERAL_FALLBACK_URL = (
    "https://www.acf.hhs.gov/css/partners/state-child-support-agencies"
)


SDU_REGISTRY: dict[str, SduEntry] = {
    "AL": SduEntry(
        "AL", "Alabama", "Alabama Child Support Payment Center",
        "https://www.alabamachildsupportpaymentcenter.com/",
        "https://dhr.alabama.gov/services/child-support-services/",
        "1-877-774-9513", False, True,
    ),
    "AK": SduEntry(
        "AK", "Alaska", "Alaska Child Support Services Division (CSSD)",
        "https://childsupport.alaska.gov/",
        "https://childsupport.alaska.gov/csed/payments.aspx",
        "1-800-478-3300", False, True,
    ),
    "AZ": SduEntry(
        "AZ", "Arizona", "Arizona Clearinghouse",
        "https://www.azchildsupport.com/",
        "https://des.az.gov/services/child-and-family/child-support",
        "1-800-882-4151", False, True,
    ),
    "AR": SduEntry(
        "AR", "Arkansas", "Arkansas OCSE Payment Center",
        "https://childsupport.arkansas.gov/",
        "https://dfa.arkansas.gov/child-support-enforcement/",
        "1-800-264-2445", False, True,
    ),
    "CA": SduEntry(
        "CA", "California", "California State Disbursement Unit (SDU)",
        "https://childsupport.ca.gov/state-disbursement-unit/",
        "https://childsupport.ca.gov/",
        "1-866-901-3212", False, True,
        "Payments are processed statewide through the CA SDU.",
    ),
    "CO": SduEntry(
        "CO", "Colorado", "Colorado Family Support Registry (FSR)",
        "https://www.childsupport.state.co.us/",
        "https://cdhs.colorado.gov/child-support",
        "1-800-374-6558", False, True,
    ),
    "CT": SduEntry(
        "CT", "Connecticut", "Connecticut Centralized Child Support Processing Center",
        "https://portal.ct.gov/dss/child-support/child-support",
        "https://portal.ct.gov/dss/child-support/child-support",
        "1-800-228-5437", False, True,
    ),
    "DE": SduEntry(
        "DE", "Delaware", "Delaware Division of Child Support Services",
        "https://dhss.delaware.gov/dcss/",
        "https://dhss.delaware.gov/dcss/",
        "1-302-577-7171", False, True,
    ),
    "DC": SduEntry(
        "DC", "District of Columbia", "DC Child Support Services Division",
        "https://cssd.dc.gov/",
        "https://cssd.dc.gov/page/make-payments",
        "1-202-442-9900", False, True,
    ),
    "FL": SduEntry(
        "FL", "Florida", "Florida State Disbursement Unit",
        "https://www.floridarevenue.com/childsupport/Pages/Payments.aspx",
        "https://www.floridarevenue.com/childsupport/",
        "1-850-488-5437", False, True,
    ),
    "GA": SduEntry(
        "GA", "Georgia", "Georgia Family Support Registry",
        "https://childsupport.georgia.gov/make-payment",
        "https://childsupport.georgia.gov/",
        "1-877-423-4746", False, True,
    ),
    "HI": SduEntry(
        "HI", "Hawaii", "Hawaii Child Support Enforcement Agency",
        "https://ag.hawaii.gov/csea/",
        "https://ag.hawaii.gov/csea/make-a-payment/",
        "1-808-692-7000", False, True,
    ),
    "ID": SduEntry(
        "ID", "Idaho", "Idaho Child Support Services",
        "https://healthandwelfare.idaho.gov/services-programs/child-support",
        "https://healthandwelfare.idaho.gov/services-programs/child-support/make-payment",
        "1-800-356-9868", False, True,
    ),
    "IL": SduEntry(
        "IL", "Illinois", "Illinois State Disbursement Unit",
        "https://www.ilsdu.com/",
        "https://hfs.illinois.gov/childsupport.html",
        "1-877-225-7077", False, True,
    ),
    "IN": SduEntry(
        "IN", "Indiana", "Indiana State Central Collection Unit",
        "https://secure.in.gov/apps/judiciary/incssds/",
        "https://www.in.gov/dcs/child-support/",
        "1-800-292-0403", False, True,
    ),
    "IA": SduEntry(
        "IA", "Iowa", "Iowa Collection Services Center",
        "https://childsupport.ia.gov/",
        "https://childsupport.ia.gov/payments",
        "1-888-229-9223", False, True,
    ),
    "KS": SduEntry(
        "KS", "Kansas", "Kansas Payment Center",
        "https://www.kansaspaymentcenter.com/",
        "https://dcf.ks.gov/services/CSS/Pages/default.aspx",
        "1-877-572-5722", False, True,
    ),
    "KY": SduEntry(
        "KY", "Kentucky", "Kentucky Child Support Interactive",
        "https://csws.chfs.ky.gov/csws/",
        "https://chfs.ky.gov/agencies/dcbs/dcs/Pages/default.aspx",
        "1-800-248-1163", False, True,
    ),
    "LA": SduEntry(
        "LA", "Louisiana", "Louisiana Child Support Enforcement",
        "https://dcfs.louisiana.gov/page/child-support-enforcement",
        "https://www.expertpay.com/", None, False, True,
        "Louisiana uses ExpertPay.com for online payments.",
    ),
    "ME": SduEntry(
        "ME", "Maine", "Maine DSER (Division of Support Enforcement & Recovery)",
        "https://www.maine.gov/dhhs/ofi/dser/",
        "https://www.maine.gov/dhhs/ofi/dser/payments",
        "1-207-624-4100", False, True,
    ),
    "MD": SduEntry(
        "MD", "Maryland", "Maryland Child Support Administration",
        "https://mdchildsupport.dhs.maryland.gov/",
        "https://mdchildsupport.dhs.maryland.gov/home/en/make-payment",
        "1-800-332-6347", False, True,
    ),
    "MA": SduEntry(
        "MA", "Massachusetts", "Massachusetts Child Support Enforcement",
        "https://www.mass.gov/child-support-services",
        "https://www.mass.gov/how-to/pay-child-support-online",
        "1-800-332-2733", False, True,
    ),
    "MI": SduEntry(
        "MI", "Michigan", "Michigan State Disbursement Unit",
        "https://micase.state.mi.us/micaseapp/",
        "https://www.michigan.gov/mdhhs/assistance-programs/childsupport",
        "1-877-543-2660", False, True,
    ),
    "MN": SduEntry(
        "MN", "Minnesota", "Minnesota Child Support Payment Center",
        "https://childsupport.dhs.state.mn.us/",
        "https://mn.gov/dhs/people-we-serve/children-and-families/services/child-support/",
        "1-800-657-3890", False, True,
    ),
    "MS": SduEntry(
        "MS", "Mississippi", "Mississippi SDU",
        "https://www.mdhs.ms.gov/child-support/",
        "https://www.ms-childsupport.com/", None, False, True,
    ),
    "MO": SduEntry(
        "MO", "Missouri", "Missouri Family Support Payment Center",
        "https://www.mopaymentcenter.com/",
        "https://dss.mo.gov/cse/",
        "1-800-859-7999", False, True,
    ),
    "MT": SduEntry(
        "MT", "Montana", "Montana CSED",
        "https://dphhs.mt.gov/csed",
        "https://dphhs.mt.gov/csed/paymentinfo",
        "1-800-346-5437", False, True,
    ),
    "NE": SduEntry(
        "NE", "Nebraska", "Nebraska Child Support Payment Center",
        "https://www.nebraskachildsupport.com/",
        "https://dhhs.ne.gov/Pages/Child-Support.aspx",
        "1-877-631-9973", False, True,
    ),
    "NV": SduEntry(
        "NV", "Nevada", "Nevada Child Support Enforcement",
        "https://dwss.nv.gov/Support/",
        "https://dwss.nv.gov/Support/CSE_Online_Payments/",
        "1-800-992-0900", False, True,
    ),
    "NH": SduEntry(
        "NH", "New Hampshire", "New Hampshire DCSS",
        "https://www.dhhs.nh.gov/programs-services/child-support-services",
        "https://www.dhhs.nh.gov/programs-services/child-support-services",
        "1-800-852-3345", False, True,
    ),
    "NJ": SduEntry(
        "NJ", "New Jersey", "New Jersey Family Support Payment Center",
        "https://www.njchildsupport.org/",
        "https://www.njchildsupport.org/Home/Payments",
        "1-877-655-4371", False, True,
    ),
    "NM": SduEntry(
        "NM", "New Mexico", "New Mexico Child Support Enforcement Division",
        "https://www.hsd.state.nm.us/lookingforassistance/child_support_services_/",
        "https://www.hsd.state.nm.us/lookingforassistance/child_support_services_/",
        "1-800-288-7207", False, True,
    ),
    "NY": SduEntry(
        "NY", "New York", "New York State Child Support Processing Center",
        "https://www.newyorkchildsupport.com/",
        "https://www.newyorkchildsupport.com/how_can_i_pay_support.html",
        "1-888-208-4485", False, True,
    ),
    "NC": SduEntry(
        "NC", "North Carolina", "North Carolina Child Support Centralized Collections",
        "https://ncchildsupport.ncdhhs.gov/",
        "https://www.ncchildsupport.com/",
        "1-800-992-9457", False, True,
    ),
    "ND": SduEntry(
        "ND", "North Dakota", "North Dakota Child Support",
        "https://childsupport.dhs.nd.gov/",
        "https://childsupport.dhs.nd.gov/payments",
        "1-701-328-7528", False, True,
    ),
    "OH": SduEntry(
        "OH", "Ohio", "Ohio Child Support Payment Central",
        "https://oh.smartchildsupport.com/",
        "https://jfs.ohio.gov/ocs/",
        "1-800-860-2555", False, True,
    ),
    "OK": SduEntry(
        "OK", "Oklahoma", "Oklahoma Centralized Support Registry",
        "https://oklahoma.gov/okdhs/services/cs.html",
        "https://www.oklahoma.gov/okdhs/services/cs/make-a-payment.html",
        "1-800-522-2922", False, True,
    ),
    "OR": SduEntry(
        "OR", "Oregon", "Oregon Child Support Program",
        "https://justice.oregon.gov/childsupport/",
        "https://justice.oregon.gov/childsupport/payments/",
        "1-800-850-0228", False, True,
    ),
    "PA": SduEntry(
        "PA", "Pennsylvania", "Pennsylvania State Collections & Disbursement Unit (PA SCDU)",
        "https://www.childsupport.state.pa.us/",
        "https://www.dhs.pa.gov/Services/Children/Pages/Child-Support-Program.aspx",
        "1-877-727-7238", False, True,
    ),
    "RI": SduEntry(
        "RI", "Rhode Island", "Rhode Island Office of Child Support Services",
        "https://dhs.ri.gov/programs-and-services/child-support-services",
        "https://www.expertpay.com/", None, False, True,
    ),
    "SC": SduEntry(
        "SC", "South Carolina", "South Carolina State Disbursement Unit",
        "https://dss.sc.gov/child-support/pay-or-receive-payments/",
        "https://dss.sc.gov/child-support/",
        "1-800-768-5858", False, True,
    ),
    "SD": SduEntry(
        "SD", "South Dakota", "South Dakota Division of Child Support",
        "https://dss.sd.gov/childsupport/",
        "https://dss.sd.gov/childsupport/payments.aspx",
        "1-605-773-3641", False, True,
    ),
    "TN": SduEntry(
        "TN", "Tennessee", "Tennessee Child Support Program",
        "https://www.tn.gov/humanservices/for-families/child-support-services.html",
        "https://tcsespaymentcenter.com/",
        "1-800-838-6911", False, True,
    ),
    "TX": SduEntry(
        "TX", "Texas", "Texas State Disbursement Unit",
        "https://childsupport.oag.texas.gov/",
        "https://portal.cs.oag.state.tx.us/",
        "1-800-252-8014", False, True,
    ),
    "UT": SduEntry(
        "UT", "Utah", "Utah Office of Recovery Services",
        "https://ors.utah.gov/",
        "https://ors.utah.gov/make-a-payment/",
        "1-801-536-8500", False, True,
    ),
    "VT": SduEntry(
        "VT", "Vermont", "Vermont Office of Child Support",
        "https://dcf.vermont.gov/ocs",
        "https://dcf.vermont.gov/ocs/payment",
        "1-800-786-3214", False, True,
    ),
    "VA": SduEntry(
        "VA", "Virginia", "Virginia Division of Child Support Enforcement",
        "https://www.dss.virginia.gov/family/dcse/",
        "https://www.dss.virginia.gov/family/dcse/payments.html",
        "1-800-468-8894", False, True,
    ),
    "WA": SduEntry(
        "WA", "Washington", "Washington State Support Registry (WSSR)",
        "https://www.dshs.wa.gov/esa/division-child-support",
        "https://www.dshs.wa.gov/esa/division-child-support/paying-child-support",
        "1-800-442-5437", False, True,
    ),
    "WV": SduEntry(
        "WV", "West Virginia", "West Virginia Bureau for Child Support Enforcement",
        "https://dhhr.wv.gov/bcse/",
        "https://dhhr.wv.gov/bcse/Pages/default.aspx",
        "1-800-249-3778", False, True,
    ),
    "WI": SduEntry(
        "WI", "Wisconsin", "Wisconsin SDU / Trust Fund",
        "https://wisconsinsdu.com/",
        "https://dcf.wisconsin.gov/cs",
        "1-800-991-5530", False, True,
    ),
    "WY": SduEntry(
        "WY", "Wyoming", "Wyoming Child Support Program",
        "https://dfs.wyo.gov/services/child-support/",
        "https://dfs.wyo.gov/services/child-support/child-support-payments/",
        "1-307-777-6948", False, True,
    ),
}


def get_sdu(state_code: str) -> Optional[SduEntry]:
    """Return the registry entry for a two-letter state code, or None."""
    if not state_code:
        return None
    return SDU_REGISTRY.get(state_code.upper())


def list_sdus() -> list[SduEntry]:
    """All registry entries sorted by state name — safe for a dropdown."""
    return sorted(SDU_REGISTRY.values(), key=lambda e: e.state_name)


def sdu_to_dict(entry: SduEntry) -> dict:
    """Serialize for API responses."""
    return {
        "state_code": entry.state_code,
        "state_name": entry.state_name,
        "sdu_name": entry.sdu_name,
        "sdu_url": entry.sdu_url,
        "info_url": entry.info_url,
        "phone": entry.phone,
        "requires_county": entry.requires_county,
        "accepts_online": entry.accepts_online,
        "notes": entry.notes,
    }
