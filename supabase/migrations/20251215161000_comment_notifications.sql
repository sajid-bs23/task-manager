-- Migration: Add Comment Notifications Trigger

-- 1. Create Function to handle new comments
CREATE OR REPLACE FUNCTION public.handle_comment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_board_id UUID;
    v_task_title TEXT;
    v_task_id UUID;
    v_actor_id UUID;
    v_message TEXT;
    v_comment_snippet TEXT;
BEGIN
    v_actor_id := NEW.user_id;
    v_task_id := NEW.task_id;
    
    -- Get Task Title and Board ID
    SELECT t.title, c.board_id 
    INTO v_task_title, v_board_id
    FROM public.tasks t
    JOIN public.columns c ON t.column_id = c.id
    WHERE t.id = v_task_id;

    -- Create snippet (first 50 chars)
    v_comment_snippet := substring(NEW.content from 1 for 50);
    IF length(NEW.content) > 50 THEN
        v_comment_snippet := v_comment_snippet || '...';
    END IF;

    v_message := 'New comment on "' || v_task_title || '": ' || v_comment_snippet;

    -- Insert notifications for all board members EXCEPT the commenter
    INSERT INTO public.notifications (user_id, task_id, type, message)
    SELECT bm.user_id, v_task_id, 'comment', v_message
    FROM public.board_members bm
    WHERE bm.board_id = v_board_id
    AND bm.user_id != v_actor_id;

    RETURN NEW;
END;
$$;

-- 2. Create Trigger
DROP TRIGGER IF EXISTS on_comment_notification ON public.task_comments;

CREATE TRIGGER on_comment_notification
    AFTER INSERT ON public.task_comments
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_comment_notification();
