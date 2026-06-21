from typing import List

from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.crud.authority import (
    bulk_deactivate_accounts,
    bulk_delete_accounts,
    delete_account,
    delete_policy,
    update_account_password,
    update_account_policy,
    update_account_scope,
    update_account_status,
    update_scope_policies,
)
from app.schemas.authority import (
    MENU_KEYS,
    MENU_LABELS,
    MENU_GROUPS,
    AccountCreate,
    AccountPasswordUpdate,
    AccountPolicyUpdate,
    AccountResponse,
    AccountScopeUpdate,
    AccountStatusUpdate,
    BulkDeactivateRequest,
    BulkDeleteRequest,
    BulkLeaderCreateRequest,
    BulkLeaderCreateResultItem,
    BulkSyncRequest,
    BulkSyncResult,
    LeaderPreviewItem,
    LeaderWithAccountItem,
    PolicyCreate,
    PolicyResponse,
    PolicyUpdate,
    ScopePoliciesResponse,
    ScopePoliciesUpdate,
)
from app.services.authority import (
    svc_bulk_create_leader_accounts,
    svc_bulk_sync_accounts,
    svc_create_account,
    svc_create_policy,
    svc_get_all_leaders_with_account_status,
    svc_get_leader_preview,
    svc_get_scope_policies,
    svc_list_accounts,
    svc_list_policies,
    svc_update_policy,
)

router = APIRouter(prefix="/api/admin", tags=["권한관리"])


# ── 계정 ─────────────────────────────────────────────────────────────────────

@router.get("/accounts", response_model=List[AccountResponse], summary="계정 목록")
def get_accounts(db: Session = Depends(get_db)):
    return svc_list_accounts(db)


@router.post("/accounts", response_model=AccountResponse, status_code=201, summary="계정 생성")
def post_account(body: AccountCreate, db: Session = Depends(get_db)):
    return svc_create_account(db, body)


@router.put("/accounts/{account_id}/password", status_code=200, summary="비밀번호 초기화")
def put_account_password(
    account_id: int = Path(...),
    body: AccountPasswordUpdate = ...,
    db: Session = Depends(get_db),
):
    update_account_password(db, account_id, body.password)
    return {"ok": True}


@router.patch("/accounts/{account_id}/scope", status_code=200, summary="데이터 범위 변경")
def patch_account_scope(
    account_id: int = Path(...),
    body: AccountScopeUpdate = ...,
    db: Session = Depends(get_db),
):
    update_account_scope(db, account_id, body.data_scope)
    return {"ok": True}


@router.patch("/accounts/{account_id}/status", status_code=200, summary="계정 활성/비활성")
def patch_account_status(
    account_id: int = Path(...),
    body: AccountStatusUpdate = ...,
    db: Session = Depends(get_db),
):
    update_account_status(db, account_id, body.is_active)
    return {"ok": True}


@router.patch("/accounts/bulk-deactivate", status_code=200, summary="계정 일괄 비활성화")
def patch_bulk_deactivate(body: BulkDeactivateRequest, db: Session = Depends(get_db)):
    bulk_deactivate_accounts(db, body.account_ids)
    return {"ok": True}


@router.delete("/accounts/{account_id}", status_code=200, summary="계정 삭제")
def delete_account_route(account_id: int = Path(...), db: Session = Depends(get_db)):
    delete_account(db, account_id)
    return {"ok": True}


@router.post("/accounts/bulk-delete", status_code=200, summary="계정 일괄 삭제")
def post_bulk_delete(body: BulkDeleteRequest, db: Session = Depends(get_db)):
    bulk_delete_accounts(db, body.account_ids)
    return {"ok": True}


@router.patch("/accounts/{account_id}/policy", status_code=200, summary="계정 정책 할당")
def patch_account_policy(
    account_id: int = Path(...),
    body: AccountPolicyUpdate = ...,
    db: Session = Depends(get_db),
):
    update_account_policy(db, account_id, body.policy_id)
    return {"ok": True}


# ── 리더 일괄 계정 생성 ──────────────────────────────────────────────────────

@router.get("/accounts/preview", response_model=List[LeaderPreviewItem], summary="계정 생성 대상 미리보기")
def get_account_preview(db: Session = Depends(get_db)):
    return svc_get_leader_preview(db)


@router.get("/accounts/leaders-all", response_model=List[LeaderWithAccountItem], summary="전체 리더 계정 현황")
def get_all_leaders(db: Session = Depends(get_db)):
    return svc_get_all_leaders_with_account_status(db)


@router.post("/accounts/bulk", response_model=List[BulkLeaderCreateResultItem], status_code=201, summary="일괄 계정 생성")
def post_bulk_accounts(body: BulkLeaderCreateRequest, db: Session = Depends(get_db)):
    return svc_bulk_create_leader_accounts(db, body)


@router.post("/accounts/bulk-sync", response_model=BulkSyncResult, status_code=200, summary="계정 일괄 동기화 (생성+비활성화)")
def post_bulk_sync(body: BulkSyncRequest, db: Session = Depends(get_db)):
    return svc_bulk_sync_accounts(db, body)


# ── 정책 ─────────────────────────────────────────────────────────────────────

@router.get("/policies", response_model=List[PolicyResponse], summary="정책 목록")
def get_policies(db: Session = Depends(get_db)):
    return svc_list_policies(db)


@router.post("/policies", response_model=PolicyResponse, status_code=201, summary="정책 생성")
def post_policy(body: PolicyCreate, db: Session = Depends(get_db)):
    return svc_create_policy(db, body)


@router.put("/policies/{policy_id}", response_model=PolicyResponse, summary="정책 수정")
def put_policy(
    policy_id: int = Path(...),
    body: PolicyUpdate = ...,
    db: Session = Depends(get_db),
):
    return svc_update_policy(db, policy_id, body)


@router.delete("/policies/{policy_id}", status_code=200, summary="정책 삭제")
def delete_policy_route(policy_id: int = Path(...), db: Session = Depends(get_db)):
    delete_policy(db, policy_id)
    return {"ok": True}


# ── 범위별 정책 할당 ──────────────────────────────────────────────────────────

@router.get("/scope-policies", response_model=ScopePoliciesResponse, summary="범위별 정책 조회")
def get_scope_policies(db: Session = Depends(get_db)):
    return svc_get_scope_policies(db)


@router.put("/scope-policies", status_code=200, summary="범위별 정책 일괄 업데이트")
def put_scope_policies(body: ScopePoliciesUpdate, db: Session = Depends(get_db)):
    update_scope_policies(db, body)
    return {"ok": True}


# ── 메뉴 키 목록 ──────────────────────────────────────────────────────────────

@router.get("/menu-keys", summary="메뉴 키 목록 (그룹별)")
def get_menu_keys():
    return {
        group: [{"key": k, "label": MENU_LABELS[k]} for k in keys]
        for group, keys in MENU_GROUPS.items()
    }
