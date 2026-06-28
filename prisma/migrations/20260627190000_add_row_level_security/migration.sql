CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '');
$$;

CREATE OR REPLACE FUNCTION app.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT app.current_user_id() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION app.is_group_member(target_group_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members member
    WHERE member.group_id = target_group_id
      AND member.user_id = app.current_user_id()
  );
$$;

CREATE OR REPLACE FUNCTION app.is_group_admin(target_group_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members member
    WHERE member.group_id = target_group_id
      AND member.user_id = app.current_user_id()
      AND member.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION app.shares_group_with_player(target_player_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members self_member
    JOIN public.group_members target_member
      ON target_member.group_id = self_member.group_id
    WHERE self_member.user_id = app.current_user_id()
      AND target_member.player_id = target_player_id
  );
$$;

CREATE OR REPLACE FUNCTION app.match_belongs_to_current_user_group(target_match_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches match_row
    WHERE match_row.id = target_match_id
      AND app.is_group_member(match_row.group_id)
  );
$$;

CREATE OR REPLACE FUNCTION app.match_pair_belongs_to_current_user_group(target_match_pair_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.match_pairs pair_row
    JOIN public.matches match_row
      ON match_row.id = pair_row.match_id
    WHERE pair_row.id = target_match_pair_id
      AND app.is_group_member(match_row.group_id)
  );
$$;

ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pair_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS player_profiles_select_policy ON public.player_profiles;
CREATE POLICY player_profiles_select_policy
ON public.player_profiles
FOR SELECT
USING (
  user_id = app.current_user_id()
  OR app.shares_group_with_player(id)
);

DROP POLICY IF EXISTS player_profiles_insert_policy ON public.player_profiles;
CREATE POLICY player_profiles_insert_policy
ON public.player_profiles
FOR INSERT
WITH CHECK (
  app.is_authenticated()
  AND user_id = app.current_user_id()
);

DROP POLICY IF EXISTS player_profiles_update_policy ON public.player_profiles;
CREATE POLICY player_profiles_update_policy
ON public.player_profiles
FOR UPDATE
USING (user_id = app.current_user_id())
WITH CHECK (user_id = app.current_user_id());

DROP POLICY IF EXISTS groups_select_policy ON public.groups;
CREATE POLICY groups_select_policy
ON public.groups
FOR SELECT
USING (app.is_group_member(id));

DROP POLICY IF EXISTS groups_insert_policy ON public.groups;
CREATE POLICY groups_insert_policy
ON public.groups
FOR INSERT
WITH CHECK (app.is_authenticated());

DROP POLICY IF EXISTS groups_update_policy ON public.groups;
CREATE POLICY groups_update_policy
ON public.groups
FOR UPDATE
USING (app.is_group_admin(id))
WITH CHECK (app.is_group_admin(id));

DROP POLICY IF EXISTS group_members_select_policy ON public.group_members;
CREATE POLICY group_members_select_policy
ON public.group_members
FOR SELECT
USING (app.is_group_member(group_id));

DROP POLICY IF EXISTS group_members_insert_policy ON public.group_members;
CREATE POLICY group_members_insert_policy
ON public.group_members
FOR INSERT
WITH CHECK (
  app.is_authenticated()
  AND user_id = app.current_user_id()
  AND role IN ('admin', 'member')
);

DROP POLICY IF EXISTS group_members_update_policy ON public.group_members;
CREATE POLICY group_members_update_policy
ON public.group_members
FOR UPDATE
USING (app.is_group_admin(group_id))
WITH CHECK (app.is_group_admin(group_id));

DROP POLICY IF EXISTS group_members_delete_policy ON public.group_members;
CREATE POLICY group_members_delete_policy
ON public.group_members
FOR DELETE
USING (app.is_group_admin(group_id));

DROP POLICY IF EXISTS matches_select_policy ON public.matches;
CREATE POLICY matches_select_policy
ON public.matches
FOR SELECT
USING (app.is_group_member(group_id));

DROP POLICY IF EXISTS matches_insert_policy ON public.matches;
CREATE POLICY matches_insert_policy
ON public.matches
FOR INSERT
WITH CHECK (app.is_group_member(group_id));

DROP POLICY IF EXISTS matches_update_policy ON public.matches;
CREATE POLICY matches_update_policy
ON public.matches
FOR UPDATE
USING (app.is_group_member(group_id))
WITH CHECK (app.is_group_member(group_id));

DROP POLICY IF EXISTS match_pairs_select_policy ON public.match_pairs;
CREATE POLICY match_pairs_select_policy
ON public.match_pairs
FOR SELECT
USING (app.match_belongs_to_current_user_group(match_id));

DROP POLICY IF EXISTS match_pairs_insert_policy ON public.match_pairs;
CREATE POLICY match_pairs_insert_policy
ON public.match_pairs
FOR INSERT
WITH CHECK (app.match_belongs_to_current_user_group(match_id));

DROP POLICY IF EXISTS match_pairs_update_policy ON public.match_pairs;
CREATE POLICY match_pairs_update_policy
ON public.match_pairs
FOR UPDATE
USING (app.match_belongs_to_current_user_group(match_id))
WITH CHECK (app.match_belongs_to_current_user_group(match_id));

DROP POLICY IF EXISTS pair_players_select_policy ON public.pair_players;
CREATE POLICY pair_players_select_policy
ON public.pair_players
FOR SELECT
USING (app.match_pair_belongs_to_current_user_group(match_pair_id));

DROP POLICY IF EXISTS pair_players_insert_policy ON public.pair_players;
CREATE POLICY pair_players_insert_policy
ON public.pair_players
FOR INSERT
WITH CHECK (app.match_pair_belongs_to_current_user_group(match_pair_id));

DROP POLICY IF EXISTS pair_players_update_policy ON public.pair_players;
CREATE POLICY pair_players_update_policy
ON public.pair_players
FOR UPDATE
USING (app.match_pair_belongs_to_current_user_group(match_pair_id))
WITH CHECK (app.match_pair_belongs_to_current_user_group(match_pair_id));

DROP POLICY IF EXISTS goals_select_policy ON public.goals;
CREATE POLICY goals_select_policy
ON public.goals
FOR SELECT
USING (app.match_belongs_to_current_user_group(match_id));

DROP POLICY IF EXISTS goals_insert_policy ON public.goals;
CREATE POLICY goals_insert_policy
ON public.goals
FOR INSERT
WITH CHECK (app.match_belongs_to_current_user_group(match_id));

DROP POLICY IF EXISTS goals_delete_policy ON public.goals;
CREATE POLICY goals_delete_policy
ON public.goals
FOR DELETE
USING (app.match_belongs_to_current_user_group(match_id));

DROP POLICY IF EXISTS tournaments_select_policy ON public.tournaments;
CREATE POLICY tournaments_select_policy
ON public.tournaments
FOR SELECT
USING (app.is_group_member(group_id));

DROP POLICY IF EXISTS tournaments_insert_policy ON public.tournaments;
CREATE POLICY tournaments_insert_policy
ON public.tournaments
FOR INSERT
WITH CHECK (app.is_group_member(group_id));

DROP POLICY IF EXISTS tournaments_update_policy ON public.tournaments;
CREATE POLICY tournaments_update_policy
ON public.tournaments
FOR UPDATE
USING (app.is_group_member(group_id))
WITH CHECK (app.is_group_member(group_id));

COMMENT ON SCHEMA app IS
'Application-level helpers for propagating the authenticated user into PostgreSQL session state for RLS checks.';

COMMENT ON FUNCTION app.current_user_id() IS
'Reads the current authenticated application user id from the PostgreSQL session via set_config/current_setting.';

COMMENT ON FUNCTION app.is_group_member(text) IS
'Returns true when the current authenticated user belongs to the target group.';

COMMENT ON FUNCTION app.is_group_admin(text) IS
'Returns true when the current authenticated user is an admin member of the target group.';

COMMENT ON FUNCTION app.shares_group_with_player(text) IS
'Returns true when the current authenticated user shares at least one group with the target player profile.';

COMMENT ON FUNCTION app.match_belongs_to_current_user_group(text) IS
'Returns true when the target match belongs to a group the current authenticated user is allowed to access.';

COMMENT ON FUNCTION app.match_pair_belongs_to_current_user_group(text) IS
'Returns true when the target match pair belongs to a match in a group the current authenticated user is allowed to access.';
