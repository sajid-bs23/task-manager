-- Migration: Make Notification Trigger Robust

CREATE OR REPLACE FUNCTION public.handle_task_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_board_id UUID;
    v_message TEXT;
    v_task_title TEXT;
    v_task_id UUID;
    v_actor_id UUID;
BEGIN
    -- Wrap in a block to catch errors and prevent blocking the main operation
    BEGIN
        -- Get current user (actor)
        v_actor_id := auth.uid();
        
        -- Determine operation type and set variables
        IF (TG_OP = 'DELETE') THEN
            v_task_id := OLD.id;
            v_task_title := OLD.title;
            SELECT board_id INTO v_board_id FROM public.columns WHERE id = OLD.column_id;
            v_message := 'Task deleted: ' || COALESCE(v_task_title, 'Unknown');
        ELSE
            v_task_id := NEW.id;
            v_task_title := NEW.title;
            SELECT board_id INTO v_board_id FROM public.columns WHERE id = NEW.column_id;
            
            IF (TG_OP = 'INSERT') THEN
                v_message := 'New task created: ' || COALESCE(v_task_title, 'Unknown');
            ELSIF (TG_OP = 'UPDATE') THEN
                IF (OLD.column_id IS DISTINCT FROM NEW.column_id) THEN
                    v_message := 'Task moved: ' || COALESCE(v_task_title, 'Unknown');
                ELSIF (OLD.title IS DISTINCT FROM NEW.title) THEN
                     v_message := 'Task renamed: ' || COALESCE(OLD.title, 'Unknown') || ' -> ' || COALESCE(NEW.title, 'Unknown');
                ELSE
                     -- Skip other updates
                     RETURN NEW; 
                END IF;
            END IF;
        END IF;

        -- Defensive Checks
        IF v_board_id IS NOT NULL AND v_message IS NOT NULL THEN
            -- Insert notifications
            INSERT INTO public.notifications (user_id, task_id, type, message)
            SELECT bm.user_id, v_task_id, 'task_update', v_message
            FROM public.board_members bm
            WHERE bm.board_id = v_board_id
            AND (v_actor_id IS NULL OR bm.user_id != v_actor_id); -- Use OR to handle NULL actor
        END IF;

    EXCEPTION WHEN OTHERS THEN
        -- Log error but do NOT fail the transaction
        RAISE WARNING 'Notification trigger failed: %', SQLERRM;
    END;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;
