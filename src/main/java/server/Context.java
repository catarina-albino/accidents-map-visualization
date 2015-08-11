package server;
import java.io.Serializable;
import java.util.Map;

import com.vividsolutions.jts.geom.Polygon;

import core.load_data.Loader;
import core.shared.Table;

public class Context implements Serializable {
	
	private static final long serialVersionUID = 1L;
	private static final String GRAIN = "year";
	private static final String EFFECT = "auto";
	
	private int toGridSize;
	private Table tableToStore;
	private String fromTable;
	private Loader loader;
	private boolean isRestricted;
	private String timeGranularity;
	private Polygon geometryRestriction;
	private String effectMode;
	private Map<String, Object> regionsComputed;

	public Context(String grain, int toGridSize, Table tableToStore, String fromTable) {
		this.timeGranularity = grain;
		this.toGridSize = toGridSize;
		this.tableToStore = tableToStore;
		this.fromTable = fromTable;
		this.loader = new Loader(tableToStore);	
		this.isRestricted = false;
		this.effectMode = EFFECT;
	}
	
	public Context() {
		this.timeGranularity = GRAIN;
		this.effectMode = EFFECT;
		this.loader = new Loader();
		this.isRestricted = false;
	}
	
	public String getTimeGranularity() {
		return timeGranularity;
	}
	
	public boolean isRestricted() {
		return isRestricted;
	}
	
	public String getEffectMode() {
		return effectMode;
	}
	
	public void setEffectMode(String effectMode) {
		this.effectMode = effectMode;
	}

	public void setRestricted(boolean isRestricted) {
		this.isRestricted = isRestricted;
	}

	public int getToGridSize() {
		return toGridSize;
	}

	public Table getTableToStore() {
		return tableToStore;
	}

	public String getFromTable() {
		return fromTable;
	}

	public Loader getLoader() {
		return loader;
	}	

	public void setTableToRead(Table tableToStore) {
		this.tableToStore = tableToStore;
		this.loader = new Loader(tableToStore);
	}

	public void setFromTable(String fromTable) {
		this.fromTable = fromTable;
	}
	
	public void setTimeGranularity(String timeGranularity) {
		this.timeGranularity = timeGranularity;
	}


	public void setLoader(Loader loader) {
		this.loader = loader;
	}
	
	public Polygon getGeometryRestriction() {
		return geometryRestriction;
	}

	public void setGeometryRestriction(Polygon geometryRestriction) {
		this.geometryRestriction = geometryRestriction;
	}
	
	public boolean isRegionComputed(String tableName) {
		return regionsComputed.containsKey(tableName);
	}

	public void setRegionComputed(String tableName) {
		regionsComputed.put(tableName, "0");
	}
	
	
	public void clearRegionsComputed() {
		regionsComputed.clear();
	}

}
