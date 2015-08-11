package server; 

import java.io.BufferedWriter;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.StreamingOutput;

import org.jboss.resteasy.annotations.GZIP;
import org.jboss.resteasy.annotations.cache.Cache;

import core.shared.Table;


@Path("spatialdata")
public class SpatialDataResource {

	public class DataResponse implements StreamingOutput {

		private static final String AAMAPS_MODE = "aa";
		
		private String posInit;
		private String posEnd;
		private String effectMode;

		public DataResponse(String posInit,String posEnd, String effectMode) {
			super();
			this.posInit = posInit; 
			this.posEnd = posEnd;
			this.effectMode = effectMode;
		}

		@Override
		public void write(final OutputStream os) throws IOException,
		WebApplicationException {

			Writer writer = new BufferedWriter(new OutputStreamWriter(os));
			Context context = Server.context;
			String geojson = "";

			if(posInit.equals(posEnd))
				geojson = context.getLoader().getInstSpatialEvents(context, posInit);
			else {
				if (effectMode.equals(AAMAPS_MODE)){
				geojson = context.getLoader().getAASpatialEvents(context, posInit, posEnd);
			}
			else geojson = context.getLoader().getRangeSpatialEvents(context, posInit, posEnd);}
			writer.write(geojson);
			writer.flush();
			writer.close();
		}
	}

	@GZIP
	@GET
	@Produces(MediaType.APPLICATION_JSON)
	@Cache(maxAge = 0)
	public Response getSpatial(@QueryParam("posInit") final String posInit,
			@QueryParam("posEnd") final String posEnd, @QueryParam("tableName") final String tableName, 
			@QueryParam("granularity") final String granularity, 
			@QueryParam("effect") final String effectMode) {
		try {
			Server.context.setTimeGranularity(granularity);
			Server.context.setFromTable(tableName);
			Server.context.setEffectMode(effectMode);

			if(tableName.equals("accidents_usa")) {
				Server.context.setTableToRead( new Table("accidents_usa_up", "pk_id"));
			}
			else if(tableName.equals("fires_portugal")) {
				Server.context.setTableToRead( new Table("fires_portugal_up", "pk_id"));
			}
			else if(tableName.equals("accidents_portugal")) {
				Server.context.setTableToRead( new Table("accidents_portugal_up", "pk_id"));
			}
			
			DataResponse info = new DataResponse(posInit, posEnd,effectMode);
			return Response.ok(info).build();
		} catch (Exception exception) {
			throw new WebApplicationException(exception);
		}
	}

}
