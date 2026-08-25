
CREATE TABLE public.popup_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_video_id text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT 'Watch this video',
  description text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT false,
  skip_after_seconds integer NOT NULL DEFAULT 5,
  last_force_trigger timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.popup_ads TO anon, authenticated;
GRANT ALL ON public.popup_ads TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.popup_ads TO authenticated;

ALTER TABLE public.popup_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "popup_ads public read"
  ON public.popup_ads FOR SELECT
  USING (true);

CREATE POLICY "popup_ads admin insert"
  ON public.popup_ads FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "popup_ads admin update"
  ON public.popup_ads FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "popup_ads admin delete"
  ON public.popup_ads FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER popup_ads_updated_at
  BEFORE UPDATE ON public.popup_ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.popup_ads (youtube_video_id, title, description, enabled, skip_after_seconds)
VALUES ('', 'Watch this video', '', false, 5);
