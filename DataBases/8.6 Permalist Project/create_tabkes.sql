-- Table: public.users

-- DROP TABLE IF EXISTS public.users;

CREATE TABLE IF NOT EXISTS public.users
(
    id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    username character varying(50) COLLATE pg_catalog."default" NOT NULL,
    password character varying(200) COLLATE pg_catalog."default" NOT NULL,
    avatarurl character varying(200) COLLATE pg_catalog."default" DEFAULT '/assets/icons/avatar.png'::character varying,
    CONSTRAINT id PRIMARY KEY (id),
    CONSTRAINT "username is unique" UNIQUE (username)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.users
    OWNER to admin;


    -- Table: public.items

-- DROP TABLE IF EXISTS public.items;

CREATE TABLE IF NOT EXISTS public.items
(
    id integer NOT NULL DEFAULT nextval('items_id_seq'::regclass),
    user_id integer,
    title character varying(100) COLLATE pg_catalog."default" NOT NULL,
    done integer DEFAULT 0,
    CONSTRAINT items_pkey PRIMARY KEY (id),
    CONSTRAINT items_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.items
    OWNER to admin;