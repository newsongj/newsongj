from typing import List

from sqlalchemy.orm import Session

from app.crud.authority import (
    bulk_create_leader_accounts as crud_bulk_create,
    bulk_sync_accounts as crud_bulk_sync,
    create_account as crud_create_account,
    create_policy as crud_create_policy,
    get_all_leaders_with_account_status as crud_get_all_leaders,
    get_leader_preview as crud_get_leader_preview,
    get_policy_menus,
    get_scope_policies as crud_get_scope_policies,
    list_accounts as crud_list_accounts,
    list_policies as crud_list_policies,
    update_policy as crud_update_policy,
)
from app.schemas.authority import (
    AccountCreate,
    AccountResponse,
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
)


def svc_list_accounts(db: Session) -> List[AccountResponse]:
    return [
        AccountResponse(
            account_id=acc.account_id,
            login_id=acc.login_id,
            data_scope=acc.data_scope,
            is_active=bool(acc.is_active),
            member_id=acc.member_id,
            name=name,
            gyogu=gyogu,
            team=team,
            group_no=group_no,
            policy_id=acc.policy_id,
            policy_name=policy_name,
        )
        for acc, name, gyogu, team, group_no, policy_name in crud_list_accounts(db)
    ]


def svc_create_account(db: Session, data: AccountCreate) -> AccountResponse:
    account = crud_create_account(db, data)
    name = gyogu = team = group_no = policy_name = None
    if account.member_id:
        from app.models import Member
        from app.crud.auth_client import get_member_profile
        member = db.query(Member).filter(Member.member_id == account.member_id).first()
        if member:
            name = member.name
        profile = get_member_profile(db, account.member_id)
        if profile:
            gyogu, team, group_no = profile.gyogu, profile.team, profile.group_no
    if account.policy_id:
        from app.models import PolicyAccess
        policy = db.query(PolicyAccess).filter(PolicyAccess.policy_id == account.policy_id).first()
        if policy:
            policy_name = policy.policy_name
    return AccountResponse(
        account_id=account.account_id,
        login_id=account.login_id,
        data_scope=account.data_scope,
        is_active=bool(account.is_active),
        member_id=account.member_id,
        name=name,
        gyogu=gyogu,
        team=team,
        group_no=group_no,
        policy_id=account.policy_id,
        policy_name=policy_name,
    )


def svc_list_policies(db: Session) -> List[PolicyResponse]:
    return [
        PolicyResponse(
            policy_id=p.policy_id,
            policy_name=p.policy_name,
            description=p.description,
            menus=get_policy_menus(db, p.policy_id),
        )
        for p in crud_list_policies(db)
    ]


def svc_create_policy(db: Session, data: PolicyCreate) -> PolicyResponse:
    policy = crud_create_policy(db, data)
    return PolicyResponse(
        policy_id=policy.policy_id,
        policy_name=policy.policy_name,
        description=policy.description,
        menus=data.menus,
    )


def svc_update_policy(db: Session, policy_id: int, data: PolicyUpdate) -> PolicyResponse:
    policy = crud_update_policy(db, policy_id, data)
    return PolicyResponse(
        policy_id=policy.policy_id,
        policy_name=policy.policy_name,
        description=policy.description,
        menus=data.menus,
    )


def svc_get_scope_policies(db: Session) -> ScopePoliciesResponse:
    return ScopePoliciesResponse(**crud_get_scope_policies(db))


def svc_get_leader_preview(db: Session) -> List[LeaderPreviewItem]:
    return [LeaderPreviewItem(**row) for row in crud_get_leader_preview(db)]


def svc_get_all_leaders_with_account_status(db: Session) -> List[LeaderWithAccountItem]:
    return [LeaderWithAccountItem(**row) for row in crud_get_all_leaders(db)]


def svc_bulk_create_leader_accounts(db: Session, data: BulkLeaderCreateRequest) -> List[BulkLeaderCreateResultItem]:
    return [BulkLeaderCreateResultItem(**row) for row in crud_bulk_create(db, data.member_ids, data.data_scope, data.policy_id)]


def svc_bulk_sync_accounts(db: Session, data: BulkSyncRequest) -> BulkSyncResult:
    result = crud_bulk_sync(db, data.all_leader_member_ids, data.active_member_ids, data.data_scope, data.policy_id)
    return BulkSyncResult(
        created=[BulkLeaderCreateResultItem(**r) for r in result["created"]],
        deactivated_count=result["deactivated_count"],
    )
